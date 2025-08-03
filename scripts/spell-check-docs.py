#!/usr/bin/env python3

"""
Documentation Spell Checker

Comprehensive spell checking for all documentation files in the project.
Uses multiple dictionaries including financial/technical terms.
"""

import os
import re
import sys
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple
from collections import defaultdict

try:
    import enchant
    from enchant.checker import SpellChecker
    ENCHANT_AVAILABLE = True
except ImportError:
    ENCHANT_AVAILABLE = False
    print("Warning: pyenchant not available. Install with: pip install pyenchant")

class DocumentationSpellChecker:
    """Comprehensive spell checker for project documentation."""
    
    def __init__(self):
        self.custom_dict = self._load_custom_dictionary()
        self.ignored_patterns = self._get_ignored_patterns()
        self.results = {
            'files_checked': 0,
            'total_errors': 0,
            'errors_by_file': {},
            'most_common_errors': defaultdict(int),
            'suggestions': {}
        }
        
        # Initialize spell checker if available
        if ENCHANT_AVAILABLE:
            try:
                self.spell_checker = enchant.Dict("en_US")
            except enchant.errors.DictNotFoundError:
                print("Warning: en_US dictionary not found. Using fallback method.")
                self.spell_checker = None
        else:
            self.spell_checker = None

    def _load_custom_dictionary(self) -> Set[str]:
        """Load custom dictionary with technical, financial, and project-specific terms."""
        
        custom_terms = {
            # Financial Terms
            'markowitz', 'sharpe', 'sortino', 'treynor', 'calmar', 'jensen',
            'covariance', 'volatility', 'correlation', 'alpha', 'beta',
            'var', 'cvar', 'drawdown', 'backtest', 'backtesting',
            'rebalancing', 'optimization', 'optimizer', 'portfolios',
            'asset', 'assets', 'allocation', 'allocations', 'weights',
            'returns', 'yield', 'yields', 'dividend', 'dividends',
            'etf', 'etfs', 'reit', 'reits', 'ipo', 'ipos',
            'nasdaq', 'nyse', 'sp500', 'russell', 'dow',
            'quantitative', 'quant', 'fintech', 'robo',
            'esg', 'socially', 'sustainable', 'sustainability',
            'capm', 'apt', 'fama', 'french', 'momentum',
            'value', 'growth', 'small', 'cap', 'large',
            'bond', 'bonds', 'treasury', 'corporate', 'municipal',
            'forex', 'fx', 'currency', 'currencies', 'commodities',
            'futures', 'options', 'derivatives', 'swaps',
            'hedge', 'fund', 'funds', 'mutual', 'index',
            'benchmark', 'benchmarks', 'outperform', 'underperform',
            'risk', 'risky', 'riskless', 'neutral', 'averse',
            'tolerance', 'appetite', 'profile', 'metrics',
            'performance', 'attribution', 'tracking', 'error',
            'liquidity', 'illiquid', 'liquid', 'bid', 'ask', 'spread',
            'market', 'markets', 'cap', 'capitalization',
            'bull', 'bear', 'bullish', 'bearish', 'sideways',
            'recession', 'expansion', 'cycle', 'cyclical',
            'sector', 'sectors', 'industry', 'industries',
            'geographic', 'geography', 'regional', 'domestic',
            'international', 'global', 'emerging', 'developed',
            
            # Technical Terms
            'api', 'apis', 'rest', 'http', 'https', 'json', 'xml',
            'oauth', 'jwt', 'auth', 'authentication', 'authorization',
            'crud', 'database', 'sql', 'nosql', 'postgresql', 'redis',
            'fastapi', 'uvicorn', 'gunicorn', 'nginx', 'docker',
            'kubernetes', 'aws', 'azure', 'gcp', 'cloud',
            'microservices', 'monolith', 'serverless', 'lambda',
            'react', 'typescript', 'javascript', 'nodejs', 'npm',
            'webpack', 'babel', 'eslint', 'prettier', 'jest',
            'vitest', 'cypress', 'playwright', 'testing',
            'ci', 'cd', 'devops', 'mlops', 'infrastructure',
            'terraform', 'ansible', 'jenkins', 'github', 'gitlab',
            'monitoring', 'logging', 'alerting', 'observability',
            'prometheus', 'grafana', 'elk', 'elasticsearch',
            'kafka', 'rabbitmq', 'celery', 'async', 'asyncio',
            'threading', 'multiprocessing', 'concurrency',
            'scalability', 'performance', 'optimization',
            'caching', 'cdn', 'load', 'balancer', 'proxy',
            'ssl', 'tls', 'certificate', 'encryption', 'hashing',
            'security', 'vulnerability', 'penetration', 'audit',
            'gdpr', 'hipaa', 'compliance', 'privacy', 'consent',
            
            # Machine Learning Terms
            'ml', 'ai', 'lstm', 'rnn', 'cnn', 'transformer',
            'neural', 'network', 'networks', 'deep', 'learning',
            'supervised', 'unsupervised', 'reinforcement',
            'classification', 'regression', 'clustering',
            'feature', 'features', 'engineering', 'selection',
            'training', 'validation', 'testing', 'overfitting',
            'underfitting', 'regularization', 'normalization',
            'standardization', 'preprocessing', 'pipeline',
            'model', 'models', 'algorithm', 'algorithms',
            'hyperparameter', 'hyperparameters', 'tuning',
            'cross', 'validation', 'kfold', 'stratified',
            'ensemble', 'bagging', 'boosting', 'stacking',
            'random', 'forest', 'gradient', 'descent',
            'adam', 'sgd', 'optimizer', 'optimizers',
            'loss', 'function', 'activation', 'relu', 'sigmoid',
            'softmax', 'dropout', 'batch', 'normalization',
            'epoch', 'epochs', 'iteration', 'batch', 'mini',
            'tensorflow', 'pytorch', 'scikit', 'learn', 'pandas',
            'numpy', 'matplotlib', 'seaborn', 'plotly',
            'jupyter', 'notebook', 'colab', 'kaggle',
            
            # Project Specific Terms
            'portfolioopt', 'dashboard', 'fintech', 'webapp',
            'frontend', 'backend', 'fullstack', 'demo',
            'realtime', 'websocket', 'webhook', 'endpoint',
            'middleware', 'cors', 'csrf', 'xss', 'sql',
            'injection', 'sanitization', 'validation',
            'serialization', 'deserialization', 'schema',
            'migration', 'seeding', 'fixtures', 'mocking',
            'stubbing', 'dependency', 'injection', 'container',
            'service', 'repository', 'pattern', 'mvc',
            'mvvm', 'component', 'props', 'state', 'hooks',
            'lifecycle', 'render', 'virtual', 'dom',
            'jsx', 'tsx', 'css', 'scss', 'tailwind',
            'responsive', 'mobile', 'tablet', 'desktop',
            'accessibility', 'aria', 'wcag', 'seo',
            'pwa', 'spa', 'ssr', 'csr', 'hydration',
            
            # Common Abbreviations
            'ui', 'ux', 'cta', 'faq', 'toc', 'api', 'url',
            'uri', 'uuid', 'guid', 'id', 'ids', 'crud',
            'http', 'https', 'ftp', 'smtp', 'tcp', 'udp',
            'ip', 'dns', 'cdn', 'ssl', 'tls', 'vpn',
            'db', 'dbs', 'os', 'cpu', 'gpu', 'ram',
            'ssd', 'hdd', 'io', 'cli', 'gui', 'sdk',
            'ide', 'vscode', 'vim', 'emacs', 'git',
            
            # Company/Product Names
            'github', 'gitlab', 'bitbucket', 'aws', 'azure',
            'google', 'microsoft', 'apple', 'amazon', 'meta',
            'facebook', 'twitter', 'linkedin', 'reddit',
            'stackoverflow', 'docker', 'kubernetes', 'vercel',
            'netlify', 'heroku', 'digitalocean', 'linode',
            'mongodb', 'postgresql', 'mysql', 'redis',
            'elasticsearch', 'firebase', 'supabase',
            'stripe', 'paypal', 'plaid', 'alpaca', 'robinhood',
            'schwab', 'fidelity', 'vanguard', 'blackrock',
            'morningstar', 'bloomberg', 'reuters', 'yahoo',
            'quandl', 'alpha', 'vantage', 'iex', 'polygon',
            
            # Miscellaneous
            'changelog', 'roadmap', 'milestone', 'sprint',
            'kanban', 'scrum', 'agile', 'waterfall',
            'retrospective', 'standup', 'backlog', 'epic',
            'story', 'stories', 'task', 'subtask', 'bug',
            'hotfix', 'patch', 'minor', 'major', 'semver',
            'versioning', 'release', 'deployment', 'rollback',
            'canary', 'blue', 'green', 'feature', 'flag',
            'toggle', 'configuration', 'environment', 'staging',
            'production', 'development', 'localhost', 'endpoint',
            'webhook', 'callback', 'promise', 'async', 'await',
            'function', 'arrow', 'closure', 'scope', 'hoisting',
            'prototypal', 'inheritance', 'polymorphism', 'encapsulation',
            'abstraction', 'interface', 'abstract', 'concrete',
            'singleton', 'factory', 'builder', 'observer',
            'decorator', 'facade', 'adapter', 'strategy'
        }
        
        return custom_terms

    def _get_ignored_patterns(self) -> List[str]:
        """Get regex patterns for text that should be ignored during spell checking."""
        
        return [
            r'```[\s\S]*?```',  # Code blocks
            r'`[^`]+`',         # Inline code
            r'http[s]?://[^\s]+',  # URLs
            r'www\.[^\s]+',     # WWW URLs
            r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',  # Email addresses
            r'\$[a-zA-Z_][a-zA-Z0-9_]*',  # Environment variables
            r'[A-Z][A-Z0-9_]{2,}',  # Constants/environment variables
            r'\d+\.\d+\.\d+',   # Version numbers
            r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',  # UUIDs
            r'\{[^}]+\}',       # Template variables
            r'\[[^\]]+\]',      # Markdown links
            r'!\[[^\]]*\]\([^)]+\)',  # Markdown images
        ]

    def _is_ignored_word(self, word: str) -> bool:
        """Check if a word should be ignored during spell checking."""
        
        # Skip very short words
        if len(word) < 3:
            return True
            
        # Skip words with numbers
        if any(c.isdigit() for c in word):
            return True
            
        # Skip all caps (likely acronyms)
        if word.isupper() and len(word) > 1:
            return True
            
        # Skip camelCase/PascalCase identifiers
        if re.match(r'^[a-z]+[A-Z][a-zA-Z]*$', word) or re.match(r'^[A-Z][a-z]+[A-Z][a-zA-Z]*$', word):
            return True
            
        # Skip words with underscores (likely identifiers)
        if '_' in word:
            return True
            
        # Skip file extensions
        if word.startswith('.') and len(word) < 6:
            return True
            
        return False

    def _preprocess_text(self, text: str) -> str:
        """Remove code blocks, URLs, and other ignored patterns from text."""
        
        for pattern in self.ignored_patterns:
            text = re.sub(pattern, ' ', text, flags=re.MULTILINE | re.DOTALL)
            
        return text

    def _extract_words(self, text: str) -> List[str]:
        """Extract words from preprocessed text."""
        
        # Split on whitespace and punctuation, but keep apostrophes in contractions
        words = re.findall(r"\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b", text)
        
        # Filter out ignored words
        words = [word.lower() for word in words if not self._is_ignored_word(word)]
        
        return words

    def _is_misspelled(self, word: str) -> bool:
        """Check if a word is misspelled."""
        
        # Check custom dictionary first
        if word.lower() in self.custom_dict:
            return False
            
        # Use enchant if available
        if self.spell_checker:
            return not self.spell_checker.check(word)
            
        # Fallback: assume common English words are correct
        # This is a very basic fallback - in production you'd want a better solution
        common_words = {
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
            'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
            'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
            'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
            'one', 'all', 'would', 'there', 'their', 'what', 'so',
            'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
            'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
            'him', 'know', 'take', 'people', 'into', 'year', 'your',
            'good', 'some', 'could', 'them', 'see', 'other', 'than',
            'then', 'now', 'look', 'only', 'come', 'its', 'over',
            'think', 'also', 'back', 'after', 'use', 'two', 'how',
            'our', 'work', 'first', 'well', 'way', 'even', 'new',
            'want', 'because', 'any', 'these', 'give', 'day', 'most',
            'us', 'is', 'was', 'are', 'been', 'has', 'had', 'were'
        }
        
        return word.lower() not in common_words

    def _get_suggestions(self, word: str) -> List[str]:
        """Get spelling suggestions for a misspelled word."""
        
        if self.spell_checker:
            try:
                return self.spell_checker.suggest(word)[:5]  # Top 5 suggestions
            except:
                pass
                
        # Simple suggestions based on custom dictionary
        suggestions = []
        word_lower = word.lower()
        
        for custom_word in self.custom_dict:
            if abs(len(custom_word) - len(word_lower)) <= 2:
                # Very basic similarity check
                common_chars = set(custom_word) & set(word_lower)
                if len(common_chars) >= max(1, min(len(custom_word), len(word_lower)) - 2):
                    suggestions.append(custom_word)
                    
        return suggestions[:5]

    def check_file(self, file_path: Path) -> Dict:
        """Check spelling in a single file."""
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # Skip binary files
            return {'errors': [], 'skipped': True, 'reason': 'binary file'}
        except Exception as e:
            return {'errors': [], 'skipped': True, 'reason': str(e)}
            
        # Preprocess content
        processed_content = self._preprocess_text(content)
        
        # Extract words
        words = self._extract_words(processed_content)
        
        # Check for misspellings
        errors = []
        for word in set(words):  # Check unique words only
            if self._is_misspelled(word):
                suggestions = self._get_suggestions(word)
                errors.append({
                    'word': word,
                    'suggestions': suggestions,
                    'count': words.count(word)
                })
                
        return {'errors': errors, 'skipped': False}

    def check_directory(self, directory_path: Path) -> None:
        """Recursively check all documentation files in a directory."""
        
        # File extensions to check
        doc_extensions = {'.md', '.rst', '.txt', '.py', '.js', '.ts', '.tsx', '.jsx'}
        
        # Directories to skip
        skip_dirs = {
            'node_modules', '.git', '__pycache__', '.pytest_cache',
            'dist', 'build', '.next', '.vscode', '.idea'
        }
        
        for file_path in directory_path.rglob('*'):
            # Skip directories in skip list
            if any(skip_dir in file_path.parts for skip_dir in skip_dirs):
                continue
                
            # Skip non-documentation files for some extensions
            if file_path.suffix in {'.py', '.js', '.ts', '.tsx', '.jsx'}:
                # Only check if it's clearly documentation
                if not any(doc_indicator in file_path.name.lower() 
                          for doc_indicator in ['readme', 'doc', 'guide', 'help']):
                    continue
                    
            if file_path.is_file() and file_path.suffix in doc_extensions:
                self.results['files_checked'] += 1
                
                print(f"Checking: {file_path.relative_to(directory_path)}")
                
                file_result = self.check_file(file_path)
                
                if file_result['skipped']:
                    print(f"  Skipped: {file_result['reason']}")
                    continue
                    
                errors = file_result['errors']
                if errors:
                    self.results['errors_by_file'][str(file_path)] = errors
                    self.results['total_errors'] += len(errors)
                    
                    print(f"  Found {len(errors)} potential misspellings:")
                    for error in errors:
                        print(f"    • {error['word']} ({error['count']} times)")
                        if error['suggestions']:
                            print(f"      Suggestions: {', '.join(error['suggestions'])}")
                            
                        # Track most common errors
                        self.results['most_common_errors'][error['word']] += error['count']
                        
                        # Store suggestions
                        if error['suggestions']:
                            self.results['suggestions'][error['word']] = error['suggestions']
                else:
                    print("  ✅ No spelling errors found")

    def generate_report(self) -> Dict:
        """Generate a comprehensive spell-check report."""
        
        # Sort most common errors
        sorted_errors = sorted(
            self.results['most_common_errors'].items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        report = {
            'summary': {
                'files_checked': self.results['files_checked'],
                'total_errors': self.results['total_errors'],
                'files_with_errors': len(self.results['errors_by_file']),
                'unique_misspellings': len(self.results['most_common_errors'])
            },
            'most_common_errors': dict(sorted_errors[:20]),  # Top 20
            'files_with_errors': self.results['errors_by_file'],
            'suggestions': self.results['suggestions'],
            'timestamp': f"{__import__('datetime').datetime.now().isoformat()}"
        }
        
        return report

    def save_report(self, report: Dict, output_file: Path) -> None:
        """Save the spell-check report to a file."""
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
            
        print(f"\n📄 Detailed report saved to: {output_file}")

    def display_summary(self, report: Dict) -> None:
        """Display a summary of the spell-check results."""
        
        print("\n" + "="*60)
        print("📝 SPELL CHECK RESULTS")
        print("="*60)
        
        summary = report['summary']
        
        print(f"\n📊 Summary:")
        print(f"  Files checked: {summary['files_checked']}")
        print(f"  Files with errors: {summary['files_with_errors']}")
        print(f"  Total potential misspellings: {summary['total_errors']}")
        print(f"  Unique misspelled words: {summary['unique_misspellings']}")
        
        if summary['total_errors'] == 0:
            print("\n✅ No spelling errors found!")
            return
            
        print(f"\n🔤 Most Common Potential Misspellings:")
        for word, count in list(report['most_common_errors'].items())[:10]:
            suggestions = report['suggestions'].get(word, [])
            suggestion_text = f" (suggestions: {', '.join(suggestions[:3])})" if suggestions else ""
            print(f"  • {word}: {count} occurrences{suggestion_text}")
            
        if summary['files_with_errors'] > 0:
            print(f"\n📁 Files with potential spelling errors:")
            for file_path in list(report['files_with_errors'].keys())[:10]:
                error_count = len(report['files_with_errors'][file_path])
                print(f"  • {file_path}: {error_count} errors")
                
            if len(report['files_with_errors']) > 10:
                print(f"  ... and {len(report['files_with_errors']) - 10} more files")

def main():
    """Main function to run the spell checker."""
    
    print("🔍 Portfolio Optimization Dashboard - Documentation Spell Checker")
    print("="*60)
    
    # Get project root directory
    project_root = Path(__file__).parent.parent
    
    # Initialize spell checker
    checker = DocumentationSpellChecker()
    
    # Check all documentation
    print(f"\nScanning documentation in: {project_root}")
    checker.check_directory(project_root)
    
    # Generate and save report
    report = checker.generate_report()
    report_file = project_root / 'spell-check-report.json'
    checker.save_report(report, report_file)
    
    # Display summary
    checker.display_summary(report)
    
    print("\n" + "="*60)
    
    # Exit with appropriate code
    if report['summary']['total_errors'] > 0:
        print("⚠️  Potential spelling errors found. Please review the report.")
        return 1
    else:
        print("✅ All documentation appears to be spelled correctly!")
        return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)