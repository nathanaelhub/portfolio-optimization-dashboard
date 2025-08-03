/**
 * Powered By Footer Component
 * 
 * Professional footer showcasing developer credentials and providing
 * easy access to GitHub, LinkedIn, and portfolio for recruiters.
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  IconButton,
  Chip,
  Stack,
  Divider,
  Tooltip,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
  Launch as LaunchIcon,
  Email as EmailIcon,
  Code as CodeIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import { trackConversionEvent } from '../../services/analytics';
import { useFeatureFlag } from '../../services/featureFlags';

interface PoweredByFooterProps {
  variant?: 'minimal' | 'detailed' | 'showcase';
  showMetrics?: boolean;
}

const DEVELOPER_INFO = {
  name: 'Nathanael Johnson',
  title: 'Senior Full-Stack Developer & Fintech Specialist',
  email: 'nathanael.johnson@example.com',
  github: 'https://github.com/nathanaeljohnson',
  linkedin: 'https://linkedin.com/in/nathanaeljohnson',
  portfolio: 'https://nathanaeljohnson.dev',
  location: 'San Francisco Bay Area',
  availability: 'Open to opportunities'
};

const PROJECT_METRICS = [
  { label: 'Optimization Speed', value: '<2s', icon: <SpeedIcon /> },
  { label: 'Test Coverage', value: '93%', icon: <SecurityIcon /> },
  { label: 'ML Accuracy', value: '63%', icon: <PsychologyIcon /> },
  { label: 'Code Quality', value: 'A+', icon: <CodeIcon /> }
];

const TECH_STACK = [
  'React', 'TypeScript', 'Python', 'FastAPI', 'PostgreSQL', 
  'Redis', 'Machine Learning', 'Portfolio Optimization'
];

export const PoweredByFooter: React.FC<PoweredByFooterProps> = ({
  variant = 'detailed',
  showMetrics = true
}) => {
  const { variant: ctaVariant } = useFeatureFlag('demo_call_to_action');

  const handleLinkClick = (platform: string, url: string) => {
    trackConversionEvent(platform as any);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleContactClick = () => {
    trackConversionEvent('contact_form');
    window.location.href = `mailto:${DEVELOPER_INFO.email}?subject=Portfolio%20Optimization%20Dashboard%20Inquiry`;
  };

  if (variant === 'minimal') {
    return (
      <Box
        component="footer"
        sx={{
          py: 2,
          px: 3,
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Built by{' '}
          <Link
            href={DEVELOPER_INFO.portfolio}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('portfolio', DEVELOPER_INFO.portfolio);
            }}
            sx={{ 
              fontWeight: 'medium',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            {DEVELOPER_INFO.name}
          </Link>
          {' '}• Full-Stack Developer specializing in Fintech & ML
        </Typography>
        
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
          <Tooltip title="View Source Code">
            <IconButton
              size="small"
              onClick={() => handleLinkClick('github_visit', DEVELOPER_INFO.github)}
              sx={{ color: 'text.secondary' }}
            >
              <GitHubIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Professional Profile">
            <IconButton
              size="small"
              onClick={() => handleLinkClick('linkedin_visit', DEVELOPER_INFO.linkedin)}
              sx={{ color: 'text.secondary' }}
            >
              <LinkedInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Send Email">
            <IconButton
              size="small"
              onClick={handleContactClick}
              sx={{ color: 'text.secondary' }}
            >
              <EmailIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    );
  }

  if (variant === 'showcase') {
    return (
      <Box
        component="footer"
        sx={{
          py: 6,
          backgroundColor: 'background.default',
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Container maxWidth="lg">
          <Card elevation={2} sx={{ mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="h5" gutterBottom fontWeight="bold">
                    Looking for a {DEVELOPER_INFO.title}?
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    This Portfolio Optimization Dashboard demonstrates expertise in full-stack development,
                    quantitative finance, machine learning, and high-performance system design.
                  </Typography>
                  
                  {showMetrics && (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      {PROJECT_METRICS.map((metric, index) => (
                        <Grid item xs={6} sm={3} key={index}>
                          <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1, bgcolor: 'background.paper' }}>
                            <Box sx={{ color: 'primary.main', mb: 0.5 }}>
                              {metric.icon}
                            </Box>
                            <Typography variant="h6" fontWeight="bold">
                              {metric.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {metric.label}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  )}

                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                    {TECH_STACK.map((tech) => (
                      <Chip
                        key={tech}
                        label={tech}
                        size="small"
                        variant="outlined"
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      {DEVELOPER_INFO.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {DEVELOPER_INFO.location}
                    </Typography>
                    <Chip
                      label={DEVELOPER_INFO.availability}
                      color="success"
                      size="small"
                      sx={{ mb: 3 }}
                    />

                    <Stack spacing={2}>
                      <Link
                        component="button"
                        variant="contained"
                        onClick={() => handleLinkClick('github_visit', DEVELOPER_INFO.github)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          p: 1.5,
                          borderRadius: 1,
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          textDecoration: 'none',
                          '&:hover': {
                            backgroundColor: 'primary.dark'
                          }
                        }}
                      >
                        <GitHubIcon />
                        View Source Code
                        <LaunchIcon fontSize="small" />
                      </Link>

                      <Link
                        component="button"
                        variant="outlined"
                        onClick={() => handleLinkClick('linkedin_visit', DEVELOPER_INFO.linkedin)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          p: 1.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          textDecoration: 'none',
                          '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'primary.contrastText'
                          }
                        }}
                      >
                        <LinkedInIcon />
                        Professional Profile
                        <LaunchIcon fontSize="small" />
                      </Link>

                      <Link
                        component="button"
                        onClick={handleContactClick}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          p: 1.5,
                          borderRadius: 1,
                          backgroundColor: 'success.main',
                          color: 'success.contrastText',
                          textDecoration: 'none',
                          '&:hover': {
                            backgroundColor: 'success.dark'
                          }
                        }}
                      >
                        <EmailIcon />
                        Contact for Opportunities
                      </Link>
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Divider sx={{ mb: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              © 2024 {DEVELOPER_INFO.name}. This is a demonstration project showcasing
              full-stack development capabilities in fintech and quantitative finance.
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  // Default 'detailed' variant
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Portfolio Optimization Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              A demonstration of full-stack fintech development capabilities featuring
              advanced portfolio optimization, machine learning integration, and 
              high-performance system design.
            </Typography>

            {showMetrics && (
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                {PROJECT_METRICS.slice(0, 2).map((metric, index) => (
                  <Box key={index} sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                      {metric.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {metric.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: { xs: 'center', md: 'right' } }}>
              <Typography variant="subtitle1" gutterBottom>
                Built by {DEVELOPER_INFO.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {DEVELOPER_INFO.title}
              </Typography>

              <Stack 
                direction="row" 
                spacing={2} 
                justifyContent={{ xs: 'center', md: 'flex-end' }}
                sx={{ mb: 2 }}
              >
                <Tooltip title="View Source Code on GitHub">
                  <IconButton
                    onClick={() => handleLinkClick('github_visit', DEVELOPER_INFO.github)}
                    sx={{ 
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' }
                    }}
                  >
                    <GitHubIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Connect on LinkedIn">
                  <IconButton
                    onClick={() => handleLinkClick('linkedin_visit', DEVELOPER_INFO.linkedin)}
                    sx={{ 
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' }
                    }}
                  >
                    <LinkedInIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Send Email">
                  <IconButton
                    onClick={handleContactClick}
                    sx={{ 
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main' }
                    }}
                  >
                    <EmailIcon />
                  </IconButton>
                </Tooltip>
              </Stack>

              {ctaVariant?.position === 'footer' && (
                <Link
                  component="button"
                  onClick={() => handleLinkClick('github_visit', DEVELOPER_INFO.github)}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    '&:hover': {
                      backgroundColor: 'primary.dark'
                    }
                  }}
                >
                  <GitHubIcon fontSize="small" />
                  {ctaVariant?.text || 'View Source Code'}
                  <LaunchIcon fontSize="small" />
                </Link>
              )}

              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2, justifyContent: { xs: 'center', md: 'flex-end' } }}>
                {TECH_STACK.slice(0, 4).map((tech) => (
                  <Chip
                    key={tech}
                    label={tech}
                    size="small"
                    variant="outlined"
                    sx={{ mb: 0.5 }}
                  />
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            © 2024 Nathanael Johnson • Demonstration Project • 
            <Link
              href={DEVELOPER_INFO.portfolio}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('portfolio', DEVELOPER_INFO.portfolio);
              }}
              sx={{ ml: 1, color: 'inherit' }}
            >
              Portfolio Website
            </Link>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default PoweredByFooter;