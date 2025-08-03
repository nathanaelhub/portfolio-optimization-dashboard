"""
WebSocket Manager for Real-time Updates
Handles WebSocket connections, real-time data streaming, and client notifications
"""

import asyncio
import json
import logging
from typing import Dict, List, Set, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import weakref
from contextlib import asynccontextmanager

from fastapi import WebSocket, WebSocketDisconnect
import redis.asyncio as redis
from sqlalchemy.orm import Session

from .market_data import MarketDataProvider
from ..database.database import get_db_session
from ..database.models import Portfolio, PortfolioHolding, Asset, User

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MessageType(Enum):
    """WebSocket message types"""
    PRICE_UPDATE = "price_update"
    PORTFOLIO_UPDATE = "portfolio_update"
    OPTIMIZATION_COMPLETE = "optimization_complete"
    ML_PREDICTION = "ml_prediction"
    MARKET_ALERT = "market_alert"
    SYSTEM_STATUS = "system_status"
    ERROR = "error"
    HEARTBEAT = "heartbeat"


@dataclass
class WebSocketMessage:
    """WebSocket message structure"""
    type: MessageType
    data: Dict[str, Any]
    timestamp: str
    client_id: Optional[str] = None
    user_id: Optional[int] = None


class ConnectionManager:
    """Manages WebSocket connections and message broadcasting"""
    
    def __init__(self):
        # Active connections by user ID
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        # Connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        # Subscription management
        self.subscriptions: Dict[str, Set[WebSocket]] = {}
        # Connection stats
        self.connection_stats = {
            'total_connections': 0,
            'active_connections': 0,
            'messages_sent': 0,
            'errors': 0
        }
    
    async def connect(self, websocket: WebSocket, user_id: int, client_id: str = None) -> bool:
        """Accept a new WebSocket connection"""
        try:
            await websocket.accept()
            
            # Add to user connections
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(websocket)
            
            # Store connection metadata
            self.connection_metadata[websocket] = {
                'user_id': user_id,
                'client_id': client_id or f"client_{len(self.connection_metadata)}",
                'connected_at': datetime.now(),
                'last_heartbeat': datetime.now(),
                'subscriptions': set()
            }
            
            # Update stats
            self.connection_stats['total_connections'] += 1
            self.connection_stats['active_connections'] = len(self.connection_metadata)
            
            logger.info(f"WebSocket connected: user_id={user_id}, client_id={client_id}")
            
            # Send welcome message
            await self.send_to_connection(websocket, WebSocketMessage(
                type=MessageType.SYSTEM_STATUS,
                data={
                    'status': 'connected',
                    'server_time': datetime.now().isoformat(),
                    'client_id': self.connection_metadata[websocket]['client_id']
                },
                timestamp=datetime.now().isoformat()
            ))
            
            return True
            
        except Exception as e:
            logger.error(f"Error connecting WebSocket: {e}")
            return False
    
    async def disconnect(self, websocket: WebSocket):
        """Handle WebSocket disconnection"""
        try:
            if websocket in self.connection_metadata:
                metadata = self.connection_metadata[websocket]
                user_id = metadata['user_id']
                
                # Remove from user connections
                if user_id in self.user_connections:
                    self.user_connections[user_id].discard(websocket)
                    if not self.user_connections[user_id]:
                        del self.user_connections[user_id]
                
                # Remove from subscriptions
                for subscription_key in metadata['subscriptions']:
                    if subscription_key in self.subscriptions:
                        self.subscriptions[subscription_key].discard(websocket)
                        if not self.subscriptions[subscription_key]:
                            del self.subscriptions[subscription_key]
                
                # Remove metadata
                del self.connection_metadata[websocket]
                
                # Update stats
                self.connection_stats['active_connections'] = len(self.connection_metadata)
                
                logger.info(f"WebSocket disconnected: user_id={user_id}")
                
        except Exception as e:
            logger.error(f"Error disconnecting WebSocket: {e}")
    
    async def send_to_connection(self, websocket: WebSocket, message: WebSocketMessage) -> bool:
        """Send message to a specific connection"""
        try:
            message_dict = asdict(message)
            await websocket.send_text(json.dumps(message_dict, default=str))
            self.connection_stats['messages_sent'] += 1
            return True
            
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected during send")
            await self.disconnect(websocket)
            return False
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {e}")
            self.connection_stats['errors'] += 1
            return False
    
    async def send_to_user(self, user_id: int, message: WebSocketMessage) -> int:
        """Send message to all connections for a user"""
        sent_count = 0
        
        if user_id in self.user_connections:
            # Create a copy of the set to avoid modification during iteration
            connections = self.user_connections[user_id].copy()
            
            for websocket in connections:
                if await self.send_to_connection(websocket, message):
                    sent_count += 1
        
        return sent_count
    
    async def broadcast_to_subscription(self, subscription_key: str, message: WebSocketMessage) -> int:
        """Broadcast message to all subscribers of a topic"""
        sent_count = 0
        
        if subscription_key in self.subscriptions:
            # Create a copy to avoid modification during iteration
            connections = self.subscriptions[subscription_key].copy()
            
            for websocket in connections:
                if await self.send_to_connection(websocket, message):
                    sent_count += 1
        
        return sent_count
    
    async def subscribe(self, websocket: WebSocket, subscription_key: str) -> bool:
        """Subscribe connection to a topic"""
        try:
            if websocket not in self.connection_metadata:
                return False
            
            # Add to subscription
            if subscription_key not in self.subscriptions:
                self.subscriptions[subscription_key] = set()
            self.subscriptions[subscription_key].add(websocket)
            
            # Update connection metadata
            self.connection_metadata[websocket]['subscriptions'].add(subscription_key)
            
            logger.info(f"WebSocket subscribed to {subscription_key}")
            return True
            
        except Exception as e:
            logger.error(f"Error subscribing to {subscription_key}: {e}")
            return False
    
    async def unsubscribe(self, websocket: WebSocket, subscription_key: str) -> bool:
        """Unsubscribe connection from a topic"""
        try:
            if subscription_key in self.subscriptions:
                self.subscriptions[subscription_key].discard(websocket)
                if not self.subscriptions[subscription_key]:
                    del self.subscriptions[subscription_key]
            
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]['subscriptions'].discard(subscription_key)
            
            logger.info(f"WebSocket unsubscribed from {subscription_key}")
            return True
            
        except Exception as e:
            logger.error(f"Error unsubscribing from {subscription_key}: {e}")
            return False
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            **self.connection_stats,
            'subscriptions': {
                key: len(connections) for key, connections in self.subscriptions.items()
            },
            'users_connected': len(self.user_connections)
        }
    
    async def cleanup_stale_connections(self):
        """Remove stale connections that haven't sent heartbeat"""
        stale_connections = []
        current_time = datetime.now()
        
        for websocket, metadata in self.connection_metadata.items():
            last_heartbeat = metadata.get('last_heartbeat', metadata['connected_at'])
            if current_time - last_heartbeat > timedelta(minutes=5):  # 5 minute timeout
                stale_connections.append(websocket)
        
        for websocket in stale_connections:
            logger.info("Removing stale WebSocket connection")
            await self.disconnect(websocket)
    
    async def handle_heartbeat(self, websocket: WebSocket):
        """Handle heartbeat from client"""
        if websocket in self.connection_metadata:
            self.connection_metadata[websocket]['last_heartbeat'] = datetime.now()
            
            await self.send_to_connection(websocket, WebSocketMessage(
                type=MessageType.HEARTBEAT,
                data={'server_time': datetime.now().isoformat()},
                timestamp=datetime.now().isoformat()
            ))


class RealTimeDataStreamer:
    """Streams real-time market data to connected clients"""
    
    def __init__(self, connection_manager: ConnectionManager, market_data_provider: MarketDataProvider):
        self.connection_manager = connection_manager
        self.market_data_provider = market_data_provider
        self.redis_client = None
        self.streaming_tasks: Dict[str, asyncio.Task] = {}
        self.update_intervals = {
            'prices': 30,  # 30 seconds
            'portfolios': 60,  # 1 minute
            'market_data': 120  # 2 minutes
        }
    
    async def initialize(self, redis_url: str = "redis://localhost:6379"):
        """Initialize Redis connection for pub/sub"""
        try:
            self.redis_client = redis.from_url(redis_url)
            await self.redis_client.ping()
            logger.info("Connected to Redis for real-time streaming")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Using fallback streaming.")
            self.redis_client = None
    
    async def start_price_streaming(self, symbols: List[str]):
        """Start streaming price updates for symbols"""
        if 'price_stream' in self.streaming_tasks:
            return  # Already running
        
        async def price_stream_task():
            while True:
                try:
                    # Get current prices
                    price_data = await self.market_data_provider.get_multiple_current_prices(symbols)
                    
                    for symbol, data in price_data.items():
                        if data and 'current_price' in data:
                            message = WebSocketMessage(
                                type=MessageType.PRICE_UPDATE,
                                data={
                                    'symbol': symbol,
                                    'price': data['current_price'],
                                    'change': data.get('previous_close', 0) - data['current_price'] if data.get('previous_close') else 0,
                                    'volume': data.get('volume', 0),
                                    'timestamp': data.get('timestamp', datetime.now().isoformat())
                                },
                                timestamp=datetime.now().isoformat()
                            )
                            
                            # Send to subscribers
                            await self.connection_manager.broadcast_to_subscription(
                                f"prices:{symbol}", message
                            )
                            await self.connection_manager.broadcast_to_subscription(
                                "prices:all", message
                            )
                    
                    await asyncio.sleep(self.update_intervals['prices'])
                    
                except Exception as e:
                    logger.error(f"Error in price streaming: {e}")
                    await asyncio.sleep(60)  # Wait longer on error
        
        self.streaming_tasks['price_stream'] = asyncio.create_task(price_stream_task())
        logger.info(f"Started price streaming for {len(symbols)} symbols")
    
    async def start_portfolio_streaming(self):
        """Start streaming portfolio updates"""
        if 'portfolio_stream' in self.streaming_tasks:
            return
        
        async def portfolio_stream_task():
            while True:
                try:
                    # Get all active portfolios
                    with get_db_session() as session:
                        portfolios = session.query(Portfolio).filter(
                            Portfolio.status == 'active'
                        ).all()
                        
                        for portfolio in portfolios:
                            # Calculate current portfolio value
                            total_value = 0
                            holdings_data = []
                            
                            for holding in portfolio.holdings:
                                # Get latest price (simplified - would use cached data in production)
                                current_price_data = await self.market_data_provider.get_current_price(
                                    holding.asset.symbol
                                )
                                
                                if current_price_data and 'current_price' in current_price_data:
                                    current_price = current_price_data['current_price']
                                    current_value = holding.shares * current_price
                                    total_value += current_value
                                    
                                    holdings_data.append({
                                        'symbol': holding.asset.symbol,
                                        'shares': float(holding.shares),
                                        'current_price': current_price,
                                        'current_value': current_value,
                                        'allocation': current_value / total_value if total_value > 0 else 0
                                    })
                            
                            # Send portfolio update
                            message = WebSocketMessage(
                                type=MessageType.PORTFOLIO_UPDATE,
                                data={
                                    'portfolio_id': portfolio.id,
                                    'total_value': total_value,
                                    'holdings': holdings_data,
                                    'last_updated': datetime.now().isoformat()
                                },
                                timestamp=datetime.now().isoformat(),
                                user_id=portfolio.user_id
                            )
                            
                            # Send to portfolio owner
                            await self.connection_manager.send_to_user(portfolio.user_id, message)
                            
                            # Send to portfolio subscribers
                            await self.connection_manager.broadcast_to_subscription(
                                f"portfolio:{portfolio.id}", message
                            )
                    
                    await asyncio.sleep(self.update_intervals['portfolios'])
                    
                except Exception as e:
                    logger.error(f"Error in portfolio streaming: {e}")
                    await asyncio.sleep(120)  # Wait longer on error
        
        self.streaming_tasks['portfolio_stream'] = asyncio.create_task(portfolio_stream_task())
        logger.info("Started portfolio streaming")
    
    async def send_optimization_result(self, user_id: int, portfolio_id: int, result: Dict[str, Any]):
        """Send optimization completion notification"""
        message = WebSocketMessage(
            type=MessageType.OPTIMIZATION_COMPLETE,
            data={
                'portfolio_id': portfolio_id,
                'result': result,
                'timestamp': datetime.now().isoformat()
            },
            timestamp=datetime.now().isoformat(),
            user_id=user_id
        )
        
        await self.connection_manager.send_to_user(user_id, message)
        logger.info(f"Sent optimization result to user {user_id}")
    
    async def send_ml_prediction(self, user_id: int, prediction_data: Dict[str, Any]):
        """Send ML prediction update"""
        message = WebSocketMessage(
            type=MessageType.ML_PREDICTION,
            data=prediction_data,
            timestamp=datetime.now().isoformat(),
            user_id=user_id
        )
        
        await self.connection_manager.send_to_user(user_id, message)
    
    async def send_market_alert(self, alert_data: Dict[str, Any], subscription_key: str = "alerts:all"):
        """Send market alert to subscribers"""
        message = WebSocketMessage(
            type=MessageType.MARKET_ALERT,
            data=alert_data,
            timestamp=datetime.now().isoformat()
        )
        
        await self.connection_manager.broadcast_to_subscription(subscription_key, message)
        logger.info(f"Sent market alert: {alert_data.get('type', 'unknown')}")
    
    async def stop_streaming(self, stream_name: str = None):
        """Stop streaming tasks"""
        if stream_name:
            if stream_name in self.streaming_tasks:
                self.streaming_tasks[stream_name].cancel()
                del self.streaming_tasks[stream_name]
                logger.info(f"Stopped {stream_name}")
        else:
            # Stop all streams
            for task_name, task in self.streaming_tasks.items():
                task.cancel()
                logger.info(f"Stopped {task_name}")
            self.streaming_tasks.clear()
    
    async def close(self):
        """Clean up resources"""
        await self.stop_streaming()
        
        if self.redis_client:
            await self.redis_client.close()


class WebSocketManager:
    """Main WebSocket manager coordinating all real-time features"""
    
    def __init__(self, market_data_provider: MarketDataProvider):
        self.connection_manager = ConnectionManager()
        self.data_streamer = RealTimeDataStreamer(self.connection_manager, market_data_provider)
        self.cleanup_task = None
    
    async def initialize(self, redis_url: str = "redis://localhost:6379"):
        """Initialize WebSocket manager"""
        await self.data_streamer.initialize(redis_url)
        
        # Start cleanup task
        self.cleanup_task = asyncio.create_task(self._periodic_cleanup())
        
        logger.info("WebSocket manager initialized")
    
    async def handle_connection(self, websocket: WebSocket, user_id: int, client_id: str = None):
        """Handle new WebSocket connection"""
        if await self.connection_manager.connect(websocket, user_id, client_id):
            try:
                # Start streaming for user's portfolios
                await self._start_user_streams(user_id)
                
                # Handle incoming messages
                async for message in websocket.iter_text():
                    await self._handle_client_message(websocket, json.loads(message))
                    
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for user {user_id}")
            except Exception as e:
                logger.error(f"Error handling WebSocket for user {user_id}: {e}")
            finally:
                await self.connection_manager.disconnect(websocket)
    
    async def _handle_client_message(self, websocket: WebSocket, message: Dict[str, Any]):
        """Handle incoming message from client"""
        try:
            message_type = message.get('type')
            data = message.get('data', {})
            
            if message_type == 'subscribe':
                subscription_key = data.get('subscription')
                if subscription_key:
                    await self.connection_manager.subscribe(websocket, subscription_key)
                    
            elif message_type == 'unsubscribe':
                subscription_key = data.get('subscription')
                if subscription_key:
                    await self.connection_manager.unsubscribe(websocket, subscription_key)
                    
            elif message_type == 'heartbeat':
                await self.connection_manager.handle_heartbeat(websocket)
                
            elif message_type == 'start_price_stream':
                symbols = data.get('symbols', [])
                if symbols:
                    await self.data_streamer.start_price_streaming(symbols)
                    
        except Exception as e:
            logger.error(f"Error handling client message: {e}")
            
            # Send error message back to client
            error_message = WebSocketMessage(
                type=MessageType.ERROR,
                data={'error': str(e), 'original_message': message},
                timestamp=datetime.now().isoformat()
            )
            await self.connection_manager.send_to_connection(websocket, error_message)
    
    async def _start_user_streams(self, user_id: int):
        """Start relevant data streams for a user"""
        try:
            with get_db_session() as session:
                # Get user's portfolio symbols
                portfolios = session.query(Portfolio).filter(
                    Portfolio.user_id == user_id,
                    Portfolio.status == 'active'
                ).all()
                
                symbols = set()
                for portfolio in portfolios:
                    for holding in portfolio.holdings:
                        symbols.add(holding.asset.symbol)
                
                if symbols:
                    await self.data_streamer.start_price_streaming(list(symbols))
                
                # Start portfolio streaming if not already running
                await self.data_streamer.start_portfolio_streaming()
                
        except Exception as e:
            logger.error(f"Error starting user streams: {e}")
    
    async def _periodic_cleanup(self):
        """Periodic cleanup of stale connections"""
        while True:
            try:
                await asyncio.sleep(300)  # Every 5 minutes
                await self.connection_manager.cleanup_stale_connections()
            except Exception as e:
                logger.error(f"Error in periodic cleanup: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get WebSocket manager statistics"""
        return {
            'connections': self.connection_manager.get_connection_stats(),
            'streaming_tasks': list(self.data_streamer.streaming_tasks.keys()),
            'server_time': datetime.now().isoformat()
        }
    
    async def close(self):
        """Clean up all resources"""
        if self.cleanup_task:
            self.cleanup_task.cancel()
        
        await self.data_streamer.close()
        
        # Disconnect all connections
        for websockets in self.connection_manager.user_connections.values():
            for websocket in websockets.copy():
                await self.connection_manager.disconnect(websocket)
        
        logger.info("WebSocket manager closed")


# Global WebSocket manager instance
websocket_manager: Optional[WebSocketManager] = None


async def get_websocket_manager() -> WebSocketManager:
    """Get or create WebSocket manager instance"""
    global websocket_manager
    
    if websocket_manager is None:
        from .market_data import create_market_data_provider
        provider = await create_market_data_provider()
        websocket_manager = WebSocketManager(provider)
        await websocket_manager.initialize()
    
    return websocket_manager


# Example usage
async def example_websocket_handler(websocket: WebSocket, user_id: int):
    """Example WebSocket endpoint handler"""
    manager = await get_websocket_manager()
    await manager.handle_connection(websocket, user_id)