# Frequently Asked Questions (FAQ)

Get quick answers to the most common questions about the Portfolio Optimization Dashboard.

## Table of Contents

1. [General Questions](#general-questions)
2. [Account & Security](#account--security)
3. [Portfolio Creation](#portfolio-creation)  
4. [Optimization Methods](#optimization-methods)
5. [Understanding Results](#understanding-results)
6. [Technical Issues](#technical-issues)
7. [Data & Privacy](#data--privacy)
8. [Pricing & Plans](#pricing--plans)

## General Questions

### What is portfolio optimization?

Portfolio optimization is a mathematical process that finds the best combination of investments to achieve your financial goals while managing risk. It uses modern portfolio theory, developed by Nobel Prize winner Harry Markowitz, to balance expected returns against the risk (volatility) of your investments.

**Key Benefits:**
- Maximize returns for a given level of risk
- Minimize risk for a target level of return  
- Improve diversification across your holdings
- Make data-driven investment decisions

### Who should use this platform?

**Individual Investors:**
- Beginning investors learning about diversification
- Experienced investors wanting professional-grade tools
- Retirement planners optimizing long-term portfolios

**Financial Professionals:**
- Financial advisors managing client portfolios
- Investment analysts conducting research
- Portfolio managers implementing quantitative strategies

**Educational Users:**
- Students learning about modern portfolio theory
- Academics researching portfolio optimization
- Anyone interested in quantitative finance

### How is this different from robo-advisors?

| Feature | Portfolio Optimization Dashboard | Traditional Robo-Advisors |
|---------|--------------------------------|---------------------------|
| **Control** | Full control over assets and methods | Limited to pre-built models |
| **Transparency** | See all calculations and assumptions | Black-box algorithms |
| **Customization** | Unlimited portfolio combinations | Fixed risk buckets |
| **Education** | Learn the theory behind decisions | Minimal educational content |
| **Advanced Features** | Factor models, Monte Carlo, custom constraints | Basic rebalancing only |

### Is this suitable for beginners?

Absolutely! The platform is designed for all experience levels:

**For Beginners:**
- Guided tutorials and educational tooltips
- Pre-built portfolio templates
- Simple optimization methods with clear explanations
- Glossary of financial terms
- Video tutorials and getting started guides

**Progressive Learning:**
- Start with basic mean-variance optimization
- Gradually explore advanced features as you learn
- Built-in help explains complex concepts
- Community forum for questions and support

## Account & Security

### How do I create an account?

1. Visit the platform and click "Sign Up"
2. Provide your email and create a secure password
3. Complete the investment profile questionnaire
4. Verify your email address
5. Start creating portfolios immediately

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character (@$!%*?&)

### Is my data secure?

Yes, we employ enterprise-grade security measures:

**Data Protection:**
- AES-256 encryption for sensitive data at rest
- TLS 1.3 encryption for data in transit
- Regular security audits and penetration testing
- SOC 2 Type II compliance

**Access Controls:**
- Multi-factor authentication available
- JWT tokens with 15-minute expiration
- Rate limiting to prevent abuse
- Comprehensive audit logging

**Privacy:**
- We never share your personal information
- Portfolio data remains private to your account
- Optional anonymous usage analytics only
- Full GDPR compliance for EU users

### Can I use multi-factor authentication?

Yes, we strongly recommend enabling MFA:

1. Go to Account Settings → Security
2. Click "Enable Two-Factor Authentication"
3. Scan the QR code with your authenticator app
4. Enter the verification code
5. Save your backup codes in a secure location

**Supported Authenticator Apps:**
- Google Authenticator
- Microsoft Authenticator  
- Authy
- 1Password
- Bitwarden

### How do I reset my password?

1. Click "Forgot Password" on the login page
2. Enter your registered email address
3. Check your email for a reset link (check spam folder)
4. Click the link and create a new password
5. The link expires after 1 hour for security

**If you don't receive the email:**
- Check your spam/junk folder
- Ensure you entered the correct email address
- Contact support if the issue persists

## Portfolio Creation

### How many assets should I include?

**Recommended Guidelines:**

| Portfolio Size | Best For | Pros | Cons |
|----------------|----------|------|------|
| **3-5 assets** | Beginners | Simple to understand, low costs | Limited diversification |
| **6-15 assets** | Most investors | Good diversification, manageable | Balanced complexity |
| **16-30 assets** | Advanced users | Excellent diversification | Higher complexity |
| **30+ assets** | Professionals | Institutional-level diversification | Very complex, high costs |

**Academic Research:** Most diversification benefits are captured with 15-20 uncorrelated assets.

### What types of assets can I include?

**Currently Supported:**
- Individual stocks (US and international)
- ETFs (Exchange-Traded Funds)
- Mutual funds (with ticker symbols)
- REITs (Real Estate Investment Trusts)
- Commodities ETFs

**Coming Soon:**
- Individual bonds
- Cryptocurrency  
- Alternative investments
- Private equity (for qualified investors)

### How should I choose assets?

**Diversification Strategy:**
1. **Asset Classes:** Stocks, bonds, commodities, real estate
2. **Geographic Regions:** US, developed international, emerging markets  
3. **Sectors:** Technology, healthcare, finance, consumer goods, etc.
4. **Market Caps:** Large-cap, mid-cap, small-cap stocks
5. **Investment Styles:** Growth vs. value, dividend vs. growth

**Example Diversified Portfolio:**
```
US Large Cap Growth (VUG): 25%
US Large Cap Value (VTV): 20%  
International Developed (VEA): 15%
Emerging Markets (VWO): 10%
US Bonds (BND): 20%
REITs (VNQ): 5%
Commodities (DJP): 5%
```

### Can I import my existing portfolio?

Yes, several options are available:

**CSV Upload:**
1. Download our template file
2. Fill in your holdings (Symbol, Shares, or Allocation)
3. Upload the file on the portfolio creation page

**Brokerage Integration** (Coming Soon):
- Direct import from major brokerages
- Automatic position updates
- Transaction history import

**Manual Entry:**
- Search and add assets one by one
- Specify quantities or target allocations
- Most flexible but time-consuming

### What if I can't find an asset?

**Troubleshooting Steps:**
1. Try different ticker symbols (e.g., class A vs. class C shares)
2. Check if it's listed on a supported exchange
3. Use the full company name in search
4. Look for similar ETFs that track the same index

**Request New Assets:**
- Email support@portfolio-dashboard.com
- Include the full name, ticker symbol, and exchange
- We typically add requested assets within 48 hours

## Optimization Methods

### Which optimization method should I choose?

**For Beginners - Maximum Sharpe Ratio:**
- Balances return and risk automatically
- Easy to understand and interpret
- Good starting point for most portfolios
- Based on Nobel Prize-winning theory

**For Conservative Investors - Minimum Volatility:**
- Focus on reducing portfolio risk
- Suitable for capital preservation goals
- May sacrifice some return for stability
- Good for near-retirement investors

**For Diversification Focus - Risk Parity:**
- Each asset contributes equally to portfolio risk
- Less dependent on return predictions
- Good performance across different market conditions
- Popular with institutional investors

**For Advanced Users - Black-Litterman:**
- Incorporate your market views and predictions
- More stable than pure mean-variance optimization
- Requires understanding of expected returns
- Used by many professional fund managers

### What's the difference between expected return and actual return?

**Expected Return:**
- Mathematical prediction based on historical data
- Input to the optimization algorithm
- Used for comparison and planning purposes
- **Not a guarantee of future performance**

**Actual Return:**
- What you actually earn from investments
- Influenced by market conditions, timing, and luck
- Can vary significantly from expected returns
- Measured after implementing the portfolio

**Important Note:** Expected returns are estimates based on historical patterns. Markets are unpredictable, and actual returns may be higher or lower than expected.

### How often should I rebalance?

**Rebalancing Frequency Guidelines:**

| Frequency | Best For | Pros | Cons |
|-----------|----------|------|------|
| **Monthly** | Active traders | Tight tracking, responsive | High costs, tax implications |
| **Quarterly** | Most investors | Good balance of discipline and cost | Moderate complexity |
| **Semi-annually** | Long-term investors | Lower costs, less maintenance | Some drift from targets |
| **Annually** | Buy-and-hold investors | Minimal maintenance and costs | Significant drift possible |

**Threshold-Based Rebalancing:**
- Rebalance when any asset drifts >5% from target
- More responsive to market conditions
- Can result in irregular rebalancing timing

### What are portfolio constraints?

Constraints are rules that limit the optimization:

**Common Constraints:**
- **Maximum Weight:** No single asset > 40% of portfolio
- **Minimum Weight:** Each asset ≥ 5% to ensure meaningful positions
- **Sector Limits:** Technology sector ≤ 30% of portfolio
- **Long-Only:** No short selling (weights ≥ 0%)
- **Turnover Limits:** Minimize trading from current portfolio

**Why Use Constraints:**
- Control risk concentration
- Implement investment preferences
- Meet regulatory requirements
- Reduce transaction costs

## Understanding Results

### Why did the optimization choose this allocation?

The algorithm considers multiple factors:

**Risk-Return Tradeoff:**
- Assets with higher expected returns get larger weights
- But weights are reduced if risk is too high
- Correlation between assets affects optimal combinations

**Diversification Benefits:**
- Assets that move independently get higher weights
- Helps reduce overall portfolio risk
- Sometimes counterintuitive allocations provide diversification

**Mathematical Optimization:**
- Algorithm finds the mathematically optimal solution
- Based on historical data and specified constraints
- May differ from intuitive or common allocations

### What if the results seem unrealistic?

**Common Causes and Solutions:**

**Extreme Allocations (e.g., 80% in one asset):**
- *Cause:* Asset appears to have very high risk-adjusted returns
- *Solution:* Add maximum weight constraints or use robust optimization

**Zero Allocations:**
- *Cause:* Asset doesn't improve the risk-return profile
- *Solution:* This is often correct - the asset may be redundant

**High Expected Returns:**
- *Cause:* Based on recent strong performance
- *Solution:* Use longer historical periods or conservative estimates

**Negative Expected Returns:**
- *Cause:* Recent poor performance in historical data
- *Solution:* Check data quality or use forward-looking estimates

### How accurate are the performance projections?

**Important Disclaimers:**
- All projections are estimates based on historical data
- Past performance does not guarantee future results
- Market conditions can change significantly
- Use projections for relative comparison, not absolute prediction

**Accuracy Considerations:**
- **Short-term (< 1 year):** Low accuracy, high uncertainty
- **Medium-term (1-5 years):** Moderate accuracy for relative comparisons
- **Long-term (> 5 years):** More reliable for broad trends

**Best Practices:**
- Focus on relative rankings between portfolios
- Consider multiple scenarios and time periods
- Regularly update projections with new data
- Combine with your own market views and research

### What's a good Sharpe ratio?

**Sharpe Ratio Interpretation:**

| Sharpe Ratio | Quality | Interpretation |
|--------------|---------|----------------|
| **< 0** | Poor | Losing money relative to risk-free investments |
| **0 - 0.5** | Adequate | Earning some risk premium |
| **0.5 - 1.0** | Good | Solid risk-adjusted returns |
| **1.0 - 2.0** | Very Good | Excellent risk-adjusted performance |
| **> 2.0** | Exceptional | Outstanding (or potentially unsustainable) |

**Context Matters:**
- Market conditions affect achievable Sharpe ratios
- Bull markets: Higher ratios more common
- Bear markets: Lower or negative ratios expected
- Asset class: Bonds typically lower than stocks

## Technical Issues

### The optimization is taking too long

**Normal Processing Times:**
- Small portfolios (< 10 assets): 2-5 seconds
- Medium portfolios (10-30 assets): 5-15 seconds  
- Large portfolios (30+ assets): 15-60 seconds
- Efficient frontier generation: 30-120 seconds

**If optimization exceeds these times:**
1. Check your internet connection
2. Try refreshing the page
3. Reduce the number of assets
4. Simplify constraints
5. Contact support if issue persists

### I'm getting error messages

**Common Error Messages and Solutions:**

**"Optimization Failed - Infeasible Constraints"**
- Your constraints cannot be satisfied simultaneously
- Try relaxing maximum/minimum weight limits
- Ensure constraint values are realistic (e.g., max weight > min weight)

**"Insufficient Historical Data"**
- Asset doesn't have enough price history
- Try using assets with longer trading history
- Reduce the historical lookback period

**"Network Error"**
- Check your internet connection
- Try refreshing the page
- Server may be temporarily unavailable

**"Invalid Asset Symbol"**
- Double-check the ticker symbol spelling
- Ensure the asset is publicly traded
- Try searching by company name instead

### Charts aren't displaying properly

**Troubleshooting Steps:**
1. Refresh your browser page
2. Clear browser cache and cookies
3. Try a different browser (Chrome, Firefox, Safari)
4. Disable browser extensions temporarily
5. Check if JavaScript is enabled

**Browser Compatibility:**
- **Recommended:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile:** iOS Safari 14+, Chrome Mobile 90+
- **Not Supported:** Internet Explorer (any version)

### Data seems outdated

**Data Update Frequency:**
- **Stock Prices:** Updated every 15 minutes during market hours
- **Portfolio Values:** Calculated in real-time based on current prices
- **Historical Data:** Updated daily after market close
- **Fundamental Data:** Updated quarterly or as reported

**If data appears incorrect:**
1. Check the timestamp on the data
2. Compare with other financial websites
3. Consider market holidays and closures
4. Report specific discrepancies to support

## Data & Privacy

### What data do you collect?

**Account Information:**
- Email address and password (encrypted)
- Investment profile responses
- Usage analytics (optional and anonymized)

**Portfolio Data:**
- Asset symbols and allocations you enter
- Optimization settings and results
- Historical performance calculations

**We Do NOT Collect:**
- Actual brokerage account information
- Social Security numbers or tax IDs
- Bank account or payment information (unless using paid features)
- Personal financial details beyond what you voluntarily enter

### How do you use my data?

**Primary Uses:**
- Provide portfolio optimization services
- Calculate performance metrics and analytics
- Improve platform features and user experience
- Send account notifications and educational content

**We Do NOT:**
- Sell your personal information to third parties
- Share portfolio details with other users
- Use your data for marketing to others
- Provide data to government agencies without legal requirement

### Can I delete my account?

Yes, you have full control over your data:

**Account Deletion Process:**
1. Go to Account Settings → Privacy & Data
2. Click "Delete Account"
3. Confirm your decision
4. All data is permanently deleted within 30 days

**What Happens:**
- All portfolio data is deleted
- Account access is immediately revoked
- Anonymized usage analytics may be retained for research
- Deletion cannot be undone

**Alternative Options:**
- Temporarily deactivate your account
- Delete specific portfolios while keeping account
- Download your data before deletion

### Is my portfolio data shared with others?

**Absolutely Not.** Your portfolio information is completely private:

- Only you can see your specific allocations and performance
- We use aggregated, anonymized data for research (optional)
- No individual portfolio details are ever shared
- Even our support team requires your explicit permission to view your portfolios for troubleshooting

**Research Data Use:**
- Aggregate statistics only (e.g., "30% of users prefer risk parity")
- No individual identification possible
- You can opt-out at any time
- Used to improve platform features and educational content

## Pricing & Plans

### Is the platform free to use?

**Free Tier Includes:**
- Create up to 3 portfolios
- Basic optimization methods (Max Sharpe, Min Volatility)
- Standard risk metrics and charts
- Educational content and tutorials
- Community forum access

**Premium Features (Paid Plans):**
- Unlimited portfolios
- Advanced optimization methods (Black-Litterman, Risk Parity)
- Monte Carlo simulations and scenario analysis
- Advanced analytics and attribution
- Priority customer support
- API access for automated rebalancing

### What are the paid plan options?

**Individual Pro ($19/month):**
- Unlimited portfolios
- All optimization methods
- Advanced analytics
- Monte Carlo simulations
- Email support

**Professional ($49/month):**
- Everything in Individual Pro
- Multi-client portfolio management
- Advanced reporting and exports
- Priority phone support
- API access

**Enterprise (Custom Pricing):**
- White-label solutions
- Custom integrations
- Dedicated account manager
- On-premise deployment options
- SLA guarantees

### Do you offer student discounts?

Yes! Students and educators receive 50% off all plans:

**Eligibility:**
- Valid .edu email address
- Currently enrolled student or active educator
- Annual verification required

**How to Apply:**
1. Register with your .edu email address
2. Upload verification (student ID or enrollment confirmation)
3. Discount applied within 24 hours
4. Renewal required annually with proof of continued enrollment

### Can I cancel anytime?

**Absolutely!**
- No long-term contracts or commitments
- Cancel anytime from your account settings
- Pro-rated refunds for unused time
- Your data remains accessible for 30 days after cancellation
- Can reactivate at any time

**Cancellation Process:**
1. Go to Account Settings → Billing
2. Click "Cancel Subscription"
3. Choose reason (optional feedback)
4. Confirm cancellation
5. Receive email confirmation

---

## Still Have Questions?

**Contact Support:**
- 📧 Email: support@portfolio-dashboard.com
- 💬 Live Chat: Available in-app during business hours (9 AM - 6 PM EST)
- 📱 Phone: +1-555-PORTFOLIO (Premium and Enterprise customers)
- 🌐 Community Forum: [community.portfolio-dashboard.com](https://community.portfolio-dashboard.com)

**Response Times:**
- Live Chat: Immediate during business hours
- Email: Within 24 hours for all users, 2 hours for Premium+
- Phone: Premium and Enterprise customers only

**Before Contacting Support:**
1. Check this FAQ for common issues
2. Review our [Getting Started Guide](getting-started.md)
3. Search the Community Forum for similar questions
4. Try the troubleshooting steps mentioned above

**When Contacting Support:**
- Include your account email address
- Describe the specific issue you're experiencing
- Mention what browser and device you're using
- Include screenshots if relevant
- Let us know what you've already tried

*This FAQ is updated regularly based on user questions and feedback. Last updated: [Current Date]*