"""
Machine Learning prediction endpoints for portfolio optimization.
"""

from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from slowapi import Limiter
from slowapi.util import get_remote_address
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

from app.schemas.portfolio import PredictionRequest
from app.services.cache import cache
from app.routers.auth import verify_token
import yfinance as yf
import hashlib
import joblib
import os

# ML imports
try:
    from sklearn.preprocessing import MinMaxScaler
    from sklearn.metrics import mean_squared_error, mean_absolute_error
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.optimizers import Adam
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("ML libraries not available. ML endpoints will return mock data.")

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)


class SimpleLSTMPredictor:
    """
    Simple LSTM model for stock return prediction.
    
    This is a lightweight implementation for demonstration.
    In production, you'd want more sophisticated feature engineering,
    ensemble methods, and proper cross-validation.
    """
    
    def __init__(self, sequence_length: int = 60, features: int = 1):
        self.sequence_length = sequence_length
        self.features = features
        self.model = None
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.is_trained = False
        
    def build_model(self) -> None:
        """Build LSTM model architecture."""
        if not ML_AVAILABLE:
            return
            
        self.model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(self.sequence_length, self.features)),
            Dropout(0.2),
            LSTM(50, return_sequences=True),
            Dropout(0.2), 
            LSTM(50),
            Dropout(0.2),
            Dense(25),
            Dense(1)
        ])
        
        self.model.compile(optimizer=Adam(learning_rate=0.001), loss='mse')
    
    def prepare_data(self, prices: pd.Series) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare time series data for LSTM training."""
        # Scale the data
        scaled_data = self.scaler.fit_transform(prices.values.reshape(-1, 1))
        
        X, y = [], []
        for i in range(self.sequence_length, len(scaled_data)):
            X.append(scaled_data[i-self.sequence_length:i, 0])
            y.append(scaled_data[i, 0])
        
        return np.array(X), np.array(y)
    
    def train(self, prices: pd.Series) -> Dict:
        """Train the LSTM model."""
        if not ML_AVAILABLE:
            return {"error": "ML libraries not available"}
        
        try:
            # Prepare data
            X, y = self.prepare_data(prices)
            
            if len(X) < 100:  # Need minimum data
                return {"error": "Insufficient data for training"}
            
            # Reshape for LSTM
            X = X.reshape((X.shape[0], X.shape[1], 1))
            
            # Train/validation split
            split_idx = int(0.8 * len(X))
            X_train, X_val = X[:split_idx], X[split_idx:]
            y_train, y_val = y[:split_idx], y[split_idx:]
            
            # Build and train model
            self.build_model()
            
            history = self.model.fit(
                X_train, y_train,
                epochs=50,
                batch_size=32,
                validation_data=(X_val, y_val),
                verbose=0,
                shuffle=False
            )
            
            # Calculate metrics
            val_pred = self.model.predict(X_val, verbose=0)
            val_pred_scaled = self.scaler.inverse_transform(val_pred)
            val_actual_scaled = self.scaler.inverse_transform(y_val.reshape(-1, 1))
            
            mse = mean_squared_error(val_actual_scaled, val_pred_scaled)
            mae = mean_absolute_error(val_actual_scaled, val_pred_scaled)
            
            self.is_trained = True
            
            return {
                "status": "success",
                "final_loss": float(history.history['loss'][-1]),
                "validation_mse": float(mse),
                "validation_mae": float(mae),
                "training_samples": len(X_train)
            }
            
        except Exception as e:
            logger.error(f"LSTM training failed: {e}")
            return {"error": f"Training failed: {str(e)}"}
    
    def predict(self, prices: pd.Series, horizon: int = 30) -> Dict:
        """Make predictions for specified horizon."""
        if not ML_AVAILABLE or not self.is_trained:
            # Return mock predictions
            return self._mock_predictions(prices, horizon)
        
        try:
            # Get last sequence for prediction
            scaled_data = self.scaler.transform(prices.values.reshape(-1, 1))
            last_sequence = scaled_data[-self.sequence_length:]
            
            predictions = []
            current_sequence = last_sequence.copy()
            
            # Generate predictions iteratively
            for _ in range(horizon):
                # Reshape for prediction
                X_pred = current_sequence.reshape((1, self.sequence_length, 1))
                
                # Predict next value
                next_pred = self.model.predict(X_pred, verbose=0)[0, 0]
                predictions.append(next_pred)
                
                # Update sequence (rolling window)
                current_sequence = np.roll(current_sequence, -1)
                current_sequence[-1] = next_pred
            
            # Inverse transform predictions
            predictions_scaled = self.scaler.inverse_transform(
                np.array(predictions).reshape(-1, 1)
            ).flatten()
            
            # Calculate confidence intervals (simplified)
            last_price = prices.iloc[-1]
            returns = predictions_scaled / last_price - 1
            
            # Simple confidence intervals based on historical volatility
            hist_vol = prices.pct_change().std() * np.sqrt(252)  # Annualized
            confidence_width = hist_vol * np.sqrt(np.arange(1, horizon + 1) / 252)
            
            upper_bound = predictions_scaled * (1 + confidence_width)
            lower_bound = predictions_scaled * (1 - confidence_width)
            
            return {
                "status": "success",
                "predictions": predictions_scaled.tolist(),
                "upper_bound": upper_bound.tolist(),
                "lower_bound": lower_bound.tolist(),
                "expected_returns": returns.tolist(),
                "confidence_level": 0.68  # ~1 sigma
            }
            
        except Exception as e:
            logger.error(f"LSTM prediction failed: {e}")
            return self._mock_predictions(prices, horizon)
    
    def _mock_predictions(self, prices: pd.Series, horizon: int) -> Dict:
        """Generate mock predictions when ML is not available."""
        last_price = prices.iloc[-1]
        returns = prices.pct_change().dropna()
        
        # Simple random walk with drift
        mean_return = returns.mean()
        volatility = returns.std()
        
        np.random.seed(42)  # For reproducible results
        
        predictions = []
        current_price = last_price
        
        for i in range(horizon):
            # Random walk with mean reversion
            drift = mean_return * 0.5  # Reduce drift for stability
            shock = np.random.normal(0, volatility)
            
            current_price *= (1 + drift + shock)
            predictions.append(current_price)
        
        # Simple confidence intervals
        predictions = np.array(predictions)
        uncertainty = volatility * np.sqrt(np.arange(1, horizon + 1))
        
        upper_bound = predictions * (1 + uncertainty)
        lower_bound = predictions * (1 - uncertainty)
        
        expected_returns = (predictions / last_price - 1).tolist()
        
        return {
            "status": "mock_data",
            "predictions": predictions.tolist(),
            "upper_bound": upper_bound.tolist(), 
            "lower_bound": lower_bound.tolist(),
            "expected_returns": expected_returns,
            "confidence_level": 0.68,
            "note": "Mock predictions generated (ML libraries not available)"
        }


class RegimeDetector:
    """
    Simple market regime detection using statistical methods.
    """
    
    @staticmethod
    def detect_regime(returns: pd.Series, window: int = 252) -> Dict:
        """Detect current market regime."""
        
        if len(returns) < window:
            return {"regime": "insufficient_data", "confidence": 0.0}
        
        recent_returns = returns.tail(window)
        
        # Calculate regime indicators
        mean_return = recent_returns.mean() * 252  # Annualized
        volatility = recent_returns.std() * np.sqrt(252)  # Annualized
        skewness = recent_returns.skew()
        kurtosis = recent_returns.kurtosis()
        
        # Rolling statistics for trend detection
        rolling_mean = recent_returns.rolling(window=21).mean()
        trend_strength = rolling_mean.iloc[-1] / rolling_mean.std()
        
        # Volatility regime
        long_vol = returns.std() * np.sqrt(252)
        vol_ratio = volatility / long_vol
        
        # Classify regime
        if mean_return > 0.15 and volatility < 0.20:
            regime = "bull_market"
            confidence = min(0.9, mean_return / 0.15 * 0.7)
            description = "Strong upward trend with moderate volatility"
            
        elif mean_return < -0.10 or volatility > 0.30:
            regime = "bear_market" 
            confidence = min(0.9, abs(mean_return) / 0.10 * 0.7)
            description = "Declining market with elevated volatility"
            
        elif vol_ratio > 1.5:
            regime = "high_volatility"
            confidence = min(0.9, vol_ratio / 1.5 * 0.6)
            description = "Elevated uncertainty and market stress"
            
        elif abs(trend_strength) < 0.5 and volatility < 0.15:
            regime = "sideways"
            confidence = 0.6
            description = "Range-bound market with low volatility"
            
        else:
            regime = "normal"
            confidence = 0.5
            description = "Typical market conditions"
        
        return {
            "regime": regime,
            "confidence": float(confidence),
            "description": description,
            "metrics": {
                "annual_return": float(mean_return),
                "annual_volatility": float(volatility),
                "skewness": float(skewness),
                "kurtosis": float(kurtosis),
                "volatility_ratio": float(vol_ratio)
            },
            "recommendation": RegimeDetector._get_recommendation(regime)
        }
    
    @staticmethod
    def _get_recommendation(regime: str) -> str:
        """Get investment recommendation based on regime."""
        recommendations = {
            "bull_market": "Consider growth-oriented assets and momentum strategies",
            "bear_market": "Focus on defensive assets and capital preservation",
            "high_volatility": "Reduce position sizes and increase diversification",
            "sideways": "Consider mean-reversion strategies and income-generating assets",
            "normal": "Maintain strategic asset allocation with regular rebalancing"
        }
        return recommendations.get(regime, "Monitor market conditions closely")


@router.post(
    "/predict",
    summary="ML Price Predictions",
    description="""
    Generate ML-based price predictions using LSTM neural networks.
    
    **Features:**
    - LSTM neural network for time series prediction
    - Confidence intervals for predictions
    - Multiple time horizons (1-252 days)
    - Expected return forecasts
    
    **Model Details:**
    - Uses 60-day historical sequences
    - 3-layer LSTM with dropout regularization
    - Trained on adjusted closing prices
    - Includes uncertainty quantification
    
    **Note:** Predictions are for educational purposes only.
    Past performance does not guarantee future results.
    """
)
@limiter.limit("10/minute")
async def predict_returns(
    request: Request,
    prediction_request: PredictionRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(verify_token)
):
    """Generate ML-based return predictions."""
    
    try:
        symbols = prediction_request.symbols
        horizon = prediction_request.horizon
        
        # Check cache
        cache_key = f"ml_predict_{hashlib.md5(f'{symbols}_{horizon}'.encode()).hexdigest()}"
        cached_result = cache.get(cache_key)
        
        if cached_result:
            return cached_result
        
        logger.info(f"Generating ML predictions for {symbols}")
        
        # Fetch historical data (need more data for LSTM)
        try:
            data = yf.download(symbols, period="2y", progress=False)['Adj Close']
            
            if isinstance(data, pd.Series):
                data = data.to_frame()
                data.columns = symbols
            
            data = data.dropna()
            
            if len(data) < 300:  # Need sufficient training data
                raise HTTPException(
                    status_code=400,
                    detail="Insufficient historical data for ML prediction"
                )
        
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch training data: {str(e)}"
            )
        
        # Generate predictions for each symbol
        predictions = {}
        
        for symbol in symbols:
            if symbol not in data.columns:
                continue
                
            prices = data[symbol].dropna()
            
            # Initialize and train LSTM
            predictor = SimpleLSTMPredictor()
            
            # Train model (in background for demo, would be pre-trained in production)
            training_result = predictor.train(prices)
            
            if "error" in training_result:
                logger.warning(f"Training failed for {symbol}: {training_result['error']}")
                # Use mock predictions
                predictions[symbol] = predictor._mock_predictions(prices, horizon)
            else:
                # Generate predictions
                pred_result = predictor.predict(prices, horizon)
                predictions[symbol] = pred_result
                predictions[symbol].update({
                    "training_metrics": training_result
                })
        
        # Generate prediction dates
        last_date = data.index[-1]
        pred_dates = pd.bdate_range(
            start=last_date + timedelta(days=1),
            periods=horizon
        ).strftime('%Y-%m-%d').tolist()
        
        result = {
            "request_id": hashlib.md5(str(datetime.now()).encode()).hexdigest()[:8],
            "symbols": symbols,
            "horizon_days": horizon,
            "prediction_dates": pred_dates,
            "predictions": predictions,
            "model_info": {
                "type": "LSTM Neural Network",
                "sequence_length": 60,
                "features": "Adjusted Close Prices",
                "training_period": "2 years",
                "confidence_level": prediction_request.confidence_level
            },
            "disclaimer": "Predictions are for educational purposes only. Not investment advice.",
            "generated_at": datetime.now().isoformat()
        }
        
        # Cache for 1 hour
        cache.set(cache_key, result, ttl=3600)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ML prediction failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction generation failed: {str(e)}"
        )


@router.post(
    "/regime-detection",
    summary="Market Regime Detection", 
    description="""
    Detect current market regime using statistical analysis.
    
    **Detected Regimes:**
    - **Bull Market**: Strong upward trend with low volatility
    - **Bear Market**: Declining prices with high volatility
    - **High Volatility**: Elevated uncertainty and stress
    - **Sideways**: Range-bound with low volatility
    - **Normal**: Typical market conditions
    
    **Analysis includes:**
    - Trend strength and direction
    - Volatility regime classification
    - Statistical moments (skewness, kurtosis)
    - Investment recommendations per regime
    """
)
@limiter.limit("20/minute")
async def detect_market_regime(
    request: Request,
    symbols: List[str],
    current_user: str = Depends(verify_token)
):
    """Detect market regime for given assets."""
    
    try:
        # Check cache
        cache_key = f"regime_detect_{hashlib.md5(','.join(sorted(symbols)).encode()).hexdigest()}"
        cached_result = cache.get(cache_key)
        
        if cached_result:
            return cached_result
        
        # Fetch data
        try:
            data = yf.download(symbols, period="2y", progress=False)['Adj Close']
            
            if isinstance(data, pd.Series):
                data = data.to_frame()
                data.columns = symbols
            
            data = data.dropna()
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch market data: {str(e)}"
            )
        
        # Detect regime for each asset
        regime_analysis = {}
        
        for symbol in symbols:
            if symbol not in data.columns:
                continue
                
            prices = data[symbol]
            returns = prices.pct_change().dropna()
            
            regime_info = RegimeDetector.detect_regime(returns)
            regime_analysis[symbol] = regime_info
        
        # Aggregate market regime (if multiple symbols)
        if len(regime_analysis) > 1:
            # Weight by equal weights for simplicity
            regime_counts = {}
            avg_confidence = 0
            
            for analysis in regime_analysis.values():
                regime = analysis['regime']
                confidence = analysis['confidence']
                
                regime_counts[regime] = regime_counts.get(regime, 0) + confidence
                avg_confidence += confidence
            
            avg_confidence /= len(regime_analysis)
            
            # Most confident regime
            dominant_regime = max(regime_counts.keys(), 
                                key=lambda x: regime_counts[x])
            
            aggregate_analysis = {
                "regime": dominant_regime,
                "confidence": avg_confidence,
                "description": f"Aggregate market regime based on {len(symbols)} assets",
                "regime_distribution": regime_counts,
                "recommendation": RegimeDetector._get_recommendation(dominant_regime)
            }
        else:
            aggregate_analysis = list(regime_analysis.values())[0] if regime_analysis else None
        
        result = {
            "symbols": symbols,
            "individual_analysis": regime_analysis,
            "aggregate_analysis": aggregate_analysis,
            "analysis_date": datetime.now().isoformat(),
            "lookback_period": "1 year"
        }
        
        # Cache for 30 minutes
        cache.set(cache_key, result, ttl=1800)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Regime detection failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Regime detection failed: {str(e)}"
        )


@router.get(
    "/model-status",
    summary="ML Model Status",
    description="""
    Get status and capabilities of ML models.
    
    **Returns:**
    - Available models and their status
    - Model performance metrics
    - Training data requirements
    - Prediction capabilities
    """
)
@limiter.limit("30/minute")
async def get_model_status(
    request: Request,
    current_user: str = Depends(verify_token)
):
    """Get ML model status and capabilities."""
    
    return {
        "ml_available": ML_AVAILABLE,
        "models": {
            "lstm_predictor": {
                "status": "available" if ML_AVAILABLE else "mock_mode",
                "description": "LSTM neural network for price prediction",
                "requirements": {
                    "min_data_points": 300,
                    "sequence_length": 60,
                    "training_time": "~30 seconds"
                },
                "capabilities": [
                    "Multi-step ahead prediction",
                    "Confidence intervals",
                    "Return forecasting"
                ]
            },
            "regime_detector": {
                "status": "available",
                "description": "Statistical market regime classification",
                "requirements": {
                    "min_data_points": 252,
                    "lookback_window": 252
                },
                "capabilities": [
                    "Bull/bear market detection",
                    "Volatility regime classification", 
                    "Investment recommendations"
                ]
            }
        },
        "disclaimer": "All ML predictions are experimental and for educational use only.",
        "performance_note": "Models are lightweight demonstrations. Production systems would use more sophisticated architectures.",
        "last_updated": datetime.now().isoformat()
    }