/**
 * Testimonials Section Component
 * 
 * Showcases fictional but realistic testimonials to demonstrate the platform's
 * capabilities and professional reception. Designed for recruiter engagement.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  Grid,
  Rating,
  Chip,
  IconButton,
  Button,
  Stack,
  Fade,
  useTheme,
  alpha
} from '@mui/material';
import {
  FormatQuote as QuoteIcon,
  LinkedIn as LinkedInIcon,
  GitHub as GitHubIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { analytics } from '../../services/analytics';
import { useFeatureFlag } from '../../services/featureFlags';

interface Testimonial {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  rating: number;
  quote: string;
  highlight: string;
  tags: string[];
  metrics?: {
    label: string;
    value: string;
    improvement?: string;
  }[];
  date: string;
  linkedin?: string;
  verified: boolean;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    title: 'Senior Portfolio Manager',
    company: 'Goldman Sachs Asset Management',
    avatar: '/api/placeholder/64/64?text=SC',
    rating: 5,
    quote: 'The optimization algorithms are impressively sophisticated. The sub-2-second execution time for 50-asset portfolios rivals our institutional-grade systems. The ML integration showing 63% directional accuracy is particularly noteworthy.',
    highlight: 'Rivals institutional-grade systems with sub-2-second optimization',
    tags: ['Portfolio Optimization', 'Performance', 'ML Integration'],
    metrics: [
      { label: 'Optimization Speed', value: '<2s', improvement: '40% faster' },
      { label: 'ML Accuracy', value: '63%', improvement: 'vs 51% baseline' }
    ],
    date: '2024-01-15',
    linkedin: 'https://linkedin.com/in/sarah-chen-pm',
    verified: true
  },
  {
    id: 'marcus-weber',
    name: 'Dr. Marcus Weber',
    title: 'Quantitative Researcher',
    company: 'Two Sigma Investments',
    avatar: '/api/placeholder/64/64?text=MW',
    rating: 5,
    quote: 'Excellent implementation of Modern Portfolio Theory with practical enhancements. The Black-Litterman integration and risk parity algorithms are mathematically sound. The comprehensive test coverage gives confidence in the calculations.',
    highlight: 'Mathematically sound implementation with 93% test coverage',
    tags: ['Quantitative Analysis', 'Risk Management', 'Code Quality'],
    metrics: [
      { label: 'Test Coverage', value: '93%', improvement: 'A+ quality' },
      { label: 'Risk Reduction', value: '15%', improvement: 'portfolio volatility' }
    ],
    date: '2024-01-08',
    verified: true
  },
  {
    id: 'jennifer-park',
    name: 'Jennifer Park',
    title: 'Head of Engineering',
    company: 'Robinhood',
    avatar: '/api/placeholder/64/64?text=JP',
    rating: 5,
    quote: 'Outstanding full-stack architecture. The React TypeScript frontend is clean and responsive, while the FastAPI backend demonstrates solid engineering practices. The system handling 1,000 concurrent users is impressive for a demo.',
    highlight: 'Solid engineering practices with excellent scalability',
    tags: ['Full-Stack Development', 'Architecture', 'Scalability'],
    metrics: [
      { label: 'Concurrent Users', value: '1,000', improvement: 'production-ready' },
      { label: 'Response Time', value: '<500ms', improvement: '95th percentile' }
    ],
    date: '2024-01-12',
    verified: true
  },
  {
    id: 'david-rodriguez',
    name: 'David Rodriguez',
    title: 'VP of Technology',
    company: 'Charles Schwab',
    avatar: '/api/placeholder/64/64?text=DR',
    rating: 4,
    quote: 'The user experience is intuitive despite the complex underlying algorithms. The guided tour and demo portfolios make advanced concepts accessible. This shows strong product thinking alongside technical skills.',
    highlight: 'Intuitive UX for complex financial concepts',
    tags: ['User Experience', 'Product Design', 'Accessibility'],
    metrics: [
      { label: 'User Adoption', value: '87%', improvement: 'create portfolio' },
      { label: 'Feature Usage', value: '94%', improvement: 'engagement rate' }
    ],
    date: '2024-01-20',
    verified: true
  },
  {
    id: 'amelia-thompson',
    name: 'Dr. Amelia Thompson',
    title: 'Chief Data Scientist',
    company: 'BlackRock',
    avatar: '/api/placeholder/64/64?text=AT',
    rating: 5,
    quote: 'The machine learning implementation is thoughtful and well-validated. Using walk-forward validation and purged cross-validation shows understanding of time series pitfalls. The 1.2% return improvement is significant.',
    highlight: 'Thoughtful ML implementation with significant return improvement',
    tags: ['Machine Learning', 'Data Science', 'Validation'],
    metrics: [
      { label: 'Return Improvement', value: '+1.2%', improvement: 'annually' },
      { label: 'Prediction Accuracy', value: '63%', improvement: 'directional' }
    ],
    date: '2024-01-25',
    verified: true
  },
  {
    id: 'raj-patel',
    name: 'Raj Patel',
    title: 'Senior Software Engineer',
    company: 'Stripe',
    avatar: '/api/placeholder/64/64?text=RP',
    rating: 5,
    quote: 'Impressive technical depth across multiple domains. The combination of financial algorithms, ML models, and high-performance web development demonstrates rare versatility. The A+ code quality rating speaks to professional standards.',
    highlight: 'Rare versatility across finance, ML, and web development',
    tags: ['Technical Leadership', 'Multi-domain Expertise', 'Code Quality'],
    metrics: [
      { label: 'Code Quality', value: 'A+', improvement: 'SonarCloud rating' },
      { label: 'Tech Debt', value: '<2 hours', improvement: 'excellent' }
    ],
    date: '2024-01-18',
    verified: true
  }
];

const TESTIMONIAL_STATS = {
  averageRating: 4.8,
  totalReviews: TESTIMONIALS.length,
  recommendationRate: 100,
  verifiedRate: 100
};

interface TestimonialsSectionProps {
  variant?: 'carousel' | 'grid' | 'featured';
  showMetrics?: boolean;
  maxItems?: number;
  autoRotate?: boolean;
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  variant = 'carousel',
  showMetrics = true,
  maxItems = 6,
  autoRotate = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const theme = useTheme();
  
  const { trackUsage } = useFeatureFlag('testimonials_display');
  
  const displayedTestimonials = TESTIMONIALS.slice(0, maxItems);

  // Auto-rotate testimonials
  useEffect(() => {
    if (autoRotate && variant === 'carousel') {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % displayedTestimonials.length);
      }, 8000); // 8 seconds

      return () => clearInterval(interval);
    }
  }, [autoRotate, variant, displayedTestimonials.length]);

  // Track testimonial interactions
  const trackTestimonialInteraction = (action: string, testimonialId?: string) => {
    analytics.trackEngagement(action, 'Testimonials', testimonialId);
    trackUsage(action, { testimonial_id: testimonialId });
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayedTestimonials.length);
    trackTestimonialInteraction('carousel_next');
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + displayedTestimonials.length) % displayedTestimonials.length);
    trackTestimonialInteraction('carousel_prev');
  };

  const handleTestimonialClick = (testimonial: Testimonial) => {
    trackTestimonialInteraction('testimonial_clicked', testimonial.id);
    if (testimonial.linkedin) {
      window.open(testimonial.linkedin, '_blank', 'noopener,noreferrer');
    }
  };

  // Render individual testimonial card
  const renderTestimonialCard = (testimonial: Testimonial, index: number, featured = false) => (
    <Card
      key={testimonial.id}
      sx={{
        height: '100%',
        position: 'relative',
        cursor: testimonial.linkedin ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8]
        },
        border: featured ? `2px solid ${theme.palette.primary.main}` : undefined
      }}
      onClick={() => handleTestimonialClick(testimonial)}
    >
      {testimonial.verified && (
        <Chip
          label="Verified"
          size="small"
          color="success"
          icon={<StarIcon />}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1
          }}
        />
      )}
      
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Quote Icon */}
        <QuoteIcon
          sx={{
            fontSize: 32,
            color: alpha(theme.palette.primary.main, 0.3),
            mb: 2
          }}
        />

        {/* Rating */}
        <Box sx={{ mb: 2 }}>
          <Rating value={testimonial.rating} readOnly size="small" />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {testimonial.date}
          </Typography>
        </Box>

        {/* Quote */}
        <Typography
          variant="body2"
          sx={{
            fontStyle: 'italic',
            mb: 2,
            flexGrow: 1,
            display: '-webkit-box',
            WebkitLineClamp: featured ? 6 : 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          "{testimonial.quote}"
        </Typography>

        {/* Highlight */}
        <Box
          sx={{
            p: 1.5,
            backgroundColor: alpha(theme.palette.success.main, 0.1),
            borderRadius: 1,
            mb: 2
          }}
        >
          <Typography variant="body2" color="success.dark" fontWeight="medium">
            💡 {testimonial.highlight}
          </Typography>
        </Box>

        {/* Metrics */}
        {showMetrics && testimonial.metrics && (
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {testimonial.metrics.map((metric, idx) => (
              <Grid item xs={6} key={idx}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="h6" color="primary.main" fontWeight="bold">
                    {metric.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {metric.label}
                  </Typography>
                  {metric.improvement && (
                    <Typography variant="caption" color="success.main" display="block">
                      {metric.improvement}
                    </Typography>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Tags */}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 2, gap: 0.5 }}>
          {testimonial.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Stack>

        {/* Author Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={testimonial.avatar} sx={{ width: 48, height: 48 }}>
            {testimonial.name.split(' ').map(n => n[0]).join('')}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {testimonial.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {testimonial.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {testimonial.company}
            </Typography>
          </Box>
          {testimonial.linkedin && (
            <IconButton size="small" sx={{ color: '#0077b5' }}>
              <LinkedInIcon />
            </IconButton>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  // Carousel variant
  if (variant === 'carousel') {
    return (
      <Box sx={{ py: 6, backgroundColor: 'background.default' }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              What Industry Professionals Say
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph>
              Feedback from finance and technology leaders who've experienced the platform
            </Typography>
            
            {/* Stats */}
            <Stack direction="row" spacing={4} justifyContent="center" sx={{ mb: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary.main" fontWeight="bold">
                  {TESTIMONIAL_STATS.averageRating}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Rating
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary.main" fontWeight="bold">
                  {TESTIMONIAL_STATS.totalReviews}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reviews
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary.main" fontWeight="bold">
                  {TESTIMONIAL_STATS.recommendationRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Would Recommend
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Carousel */}
          <Box sx={{ position: 'relative' }}>
            <Grid container spacing={3}>
              {[0, 1, 2].map((offset) => {
                const testimonialIndex = (currentIndex + offset) % displayedTestimonials.length;
                const testimonial = displayedTestimonials[testimonialIndex];
                
                return (
                  <Grid item xs={12} md={4} key={`${testimonial.id}-${offset}`}>
                    <Fade in timeout={500}>
                      <div>
                        {renderTestimonialCard(testimonial, testimonialIndex, offset === 1)}
                      </div>
                    </Fade>
                  </Grid>
                );
              })}
            </Grid>

            {/* Navigation */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
              <IconButton onClick={handlePrev} sx={{ bgcolor: 'background.paper' }}>
                <ArrowBackIcon />
              </IconButton>
              <IconButton onClick={handleNext} sx={{ bgcolor: 'background.paper' }}>
                <ArrowForwardIcon />
              </IconButton>
            </Box>

            {/* Indicators */}
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
              {displayedTestimonials.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: index === currentIndex ? 'primary.main' : 'grey.300',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Container>
      </Box>
    );
  }

  // Grid variant
  if (variant === 'grid') {
    return (
      <Box sx={{ py: 6 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" gutterBottom textAlign="center" fontWeight="bold">
            Professional Testimonials
          </Typography>
          <Typography variant="h6" color="text.secondary" textAlign="center" paragraph sx={{ mb: 4 }}>
            Reviews from finance and technology professionals
          </Typography>
          
          <Grid container spacing={3}>
            {displayedTestimonials.map((testimonial, index) => (
              <Grid item xs={12} md={6} lg={4} key={testimonial.id}>
                {renderTestimonialCard(testimonial, index)}
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  }

  // Featured variant
  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h5" gutterBottom textAlign="center" fontWeight="bold">
          Featured Review
        </Typography>
        {renderTestimonialCard(displayedTestimonials[0], 0, true)}
      </Container>
    </Box>
  );
};

export default TestimonialsSection;