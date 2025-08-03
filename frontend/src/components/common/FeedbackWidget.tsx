/**
 * Feedback Widget Component
 * 
 * Collects user feedback on demo experience for continuous improvement
 * and provides valuable insights for recruiters about user engagement.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  Rating,
  TextField,
  Typography,
  Slide,
  Alert,
  Chip,
  Stack,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar
} from '@mui/material';
import {
  Feedback as FeedbackIcon,
  Close as CloseIcon,
  Send as SendIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  BugReport as BugReportIcon,
  Lightbulb as IdeaIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { analytics } from '../../services/analytics';
import { useFeatureFlag } from '../../services/featureFlags';

interface FeedbackData {
  rating: number;
  category: string;
  message: string;
  features_used: string[];
  would_recommend: boolean;
  contact_info?: string;
  experience_level: string;
  primary_use_case: string;
}

interface FeedbackWidgetProps {
  variant?: 'fab' | 'inline' | 'modal';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showAfterDelay?: number;
  triggerOnAction?: string;
}

const FEEDBACK_CATEGORIES = [
  { value: 'general', label: '💭 General Feedback', icon: <FeedbackIcon /> },
  { value: 'bug', label: '🐛 Bug Report', icon: <BugReportIcon /> },
  { value: 'feature', label: '💡 Feature Request', icon: <IdeaIcon /> },
  { value: 'performance', label: '⚡ Performance Issue', icon: <StarIcon /> },
  { value: 'ui_ux', label: '🎨 UI/UX Feedback', icon: <ThumbUpIcon /> },
  { value: 'documentation', label: '📚 Documentation', icon: <FeedbackIcon /> }
];

const EXPERIENCE_LEVELS = [
  'Student/Learning',
  'Junior Developer',
  'Mid-level Developer', 
  'Senior Developer',
  'Tech Lead/Architect',
  'Engineering Manager',
  'Finance Professional',
  'Other'
];

const USE_CASES = [
  'Evaluating for hiring',
  'Learning portfolio optimization',
  'Comparing to existing tools',
  'Academic research',
  'Personal investment analysis',
  'Building similar application',
  'General curiosity',
  'Other'
];

const DEMO_FEATURES = [
  'Portfolio Optimization',
  'Risk Analysis',
  'Efficient Frontier',
  'Backtesting',
  'CSV Import/Export',
  'Guided Tour',
  'Performance Charts',
  'Asset Allocation',
  'ML Predictions',
  'Demo Portfolios'
];

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  variant = 'fab',
  position = 'bottom-right',
  showAfterDelay = 30000, // 30 seconds
  triggerOnAction
}) => {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { trackUsage } = useFeatureFlag('feedback_widget');

  // Form state
  const [feedback, setFeedback] = useState<FeedbackData>({
    rating: 0,
    category: 'general',
    message: '',
    features_used: [],
    would_recommend: false,
    contact_info: '',
    experience_level: '',
    primary_use_case: ''
  });

  // Auto-show after delay
  React.useEffect(() => {
    if (variant === 'fab' && showAfterDelay > 0) {
      const timer = setTimeout(() => {
        setIsExpanded(true);
        trackUsage('auto_expanded');
      }, showAfterDelay);

      return () => clearTimeout(timer);
    }
  }, [showAfterDelay, variant, trackUsage]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    trackUsage('opened');
    analytics.trackEngagement('feedback_widget_opened', 'User Feedback');
  }, [trackUsage]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setIsExpanded(false);
    trackUsage('closed');
  }, [trackUsage]);

  const handleSubmit = useCallback(async () => {
    try {
      // Track feedback submission
      analytics.trackDemoEvent({
        event_name: 'feedback_submitted',
        event_category: 'User Feedback',
        event_label: feedback.category,
        value: feedback.rating,
        custom_parameters: {
          category: feedback.category,
          rating: feedback.rating,
          message_length: feedback.message.length,
          features_used_count: feedback.features_used.length,
          would_recommend: feedback.would_recommend,
          experience_level: feedback.experience_level,
          primary_use_case: feedback.primary_use_case,
          has_contact_info: !!feedback.contact_info
        }
      });

      // In a real application, you would send this to your backend
      console.log('Feedback submitted:', feedback);

      // Store in localStorage for demo purposes
      const existingFeedback = JSON.parse(localStorage.getItem('demo_feedback') || '[]');
      existingFeedback.push({
        ...feedback,
        timestamp: new Date().toISOString(),
        user_id: localStorage.getItem('demo_user_id'),
        session_id: Date.now()
      });
      localStorage.setItem('demo_feedback', JSON.stringify(existingFeedback));

      setSubmitted(true);
      setShowSuccess(true);
      
      setTimeout(() => {
        handleClose();
        setSubmitted(false);
      }, 2000);

      trackUsage('submitted', { category: feedback.category, rating: feedback.rating });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      analytics.trackError(error as Error, { context: 'feedback_submission' });
    }
  }, [feedback, handleClose, trackUsage]);

  const positionStyles = {
    'bottom-right': { bottom: 24, right: 24 },
    'bottom-left': { bottom: 24, left: 24 },
    'top-right': { top: 24, right: 24 },
    'top-left': { top: 24, left: 24 }
  };

  // FAB variant
  if (variant === 'fab') {
    return (
      <>
        <Box sx={{ position: 'fixed', zIndex: 1300, ...positionStyles[position] }}>
          {!isExpanded ? (
            <Fab
              color="primary"
              onClick={() => setIsExpanded(true)}
              sx={{
                '&:hover': {
                  transform: 'scale(1.1)',
                  transition: 'transform 0.2s'
                }
              }}
            >
              <FeedbackIcon />
            </Fab>
          ) : (
            <Card sx={{ minWidth: 300, maxWidth: 350 }}>
              <CardContent sx={{ pb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Quick Feedback</Typography>
                  <IconButton size="small" onClick={() => setIsExpanded(false)}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  How was your demo experience?
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ThumbUpIcon />}
                    onClick={() => {
                      analytics.trackEngagement('quick_positive_feedback', 'User Feedback');
                      trackUsage('quick_positive');
                      setShowSuccess(true);
                    }}
                  >
                    Great!
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ThumbDownIcon />}
                    onClick={handleOpen}
                  >
                    Issues
                  </Button>
                </Stack>

                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  onClick={handleOpen}
                >
                  Detailed Feedback
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>

        <FeedbackDialog />
      </>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <Card sx={{ my: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <FeedbackIcon color="primary" />
            <Typography variant="h6">Share Your Feedback</Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your feedback helps improve this demo and showcases user engagement to potential employers.
          </Typography>
          
          <Button variant="contained" onClick={handleOpen} startIcon={<FeedbackIcon />}>
            Give Feedback
          </Button>
        </CardContent>
        
        <FeedbackDialog />
      </Card>
    );
  }

  // Modal variant (just the dialog)
  return <FeedbackDialog />;

  function FeedbackDialog() {
    return (
      <>
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="md"
          fullWidth
          TransitionComponent={Transition}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FeedbackIcon color="primary" />
              Share Your Demo Experience
            </Box>
          </DialogTitle>

          <DialogContent sx={{ pb: 2 }}>
            {submitted ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ThumbUpIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Thank you for your feedback!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your insights help demonstrate user engagement and improve the platform.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={3}>
                {/* Overall Rating */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Overall Experience *
                  </Typography>
                  <Rating
                    value={feedback.rating}
                    onChange={(_, value) => setFeedback(prev => ({ ...prev, rating: value || 0 }))}
                    size="large"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Rate your experience with this portfolio optimization demo
                  </Typography>
                </Box>

                {/* Category */}
                <FormControl fullWidth>
                  <InputLabel>Feedback Category *</InputLabel>
                  <Select
                    value={feedback.category}
                    onChange={(e) => setFeedback(prev => ({ ...prev, category: e.target.value }))}
                    label="Feedback Category *"
                  >
                    {FEEDBACK_CATEGORIES.map((cat) => (
                      <MenuItem key={cat.value} value={cat.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {cat.icon}
                          {cat.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Message */}
                <TextField
                  label="Your Feedback *"
                  multiline
                  rows={4}
                  value={feedback.message}
                  onChange={(e) => setFeedback(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Share your thoughts about the demo, features you liked, or suggestions for improvement..."
                  fullWidth
                />

                {/* Features Used */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Which features did you try?
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                    {DEMO_FEATURES.map((feature) => (
                      <Chip
                        key={feature}
                        label={feature}
                        clickable
                        color={feedback.features_used.includes(feature) ? 'primary' : 'default'}
                        onClick={() => {
                          setFeedback(prev => ({
                            ...prev,
                            features_used: prev.features_used.includes(feature)
                              ? prev.features_used.filter(f => f !== feature)
                              : [...prev.features_used, feature]
                          }));
                        }}
                        size="small"
                      />
                    ))}
                  </Stack>
                </Box>

                {/* Experience Level */}
                <FormControl fullWidth>
                  <InputLabel>Your Experience Level</InputLabel>
                  <Select
                    value={feedback.experience_level}
                    onChange={(e) => setFeedback(prev => ({ ...prev, experience_level: e.target.value }))}
                    label="Your Experience Level"
                  >
                    {EXPERIENCE_LEVELS.map((level) => (
                      <MenuItem key={level} value={level}>{level}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Primary Use Case */}
                <FormControl fullWidth>
                  <InputLabel>Why are you viewing this demo?</InputLabel>
                  <Select
                    value={feedback.primary_use_case}
                    onChange={(e) => setFeedback(prev => ({ ...prev, primary_use_case: e.target.value }))}
                    label="Why are you viewing this demo?"
                  >
                    {USE_CASES.map((useCase) => (
                      <MenuItem key={useCase} value={useCase}>{useCase}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Recommendation */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedback.would_recommend}
                      onChange={(e) => setFeedback(prev => ({ ...prev, would_recommend: e.target.checked }))}
                    />
                  }
                  label="I would recommend this developer to others"
                />

                {/* Contact Info (Optional) */}
                <TextField
                  label="Contact Info (Optional)"
                  value={feedback.contact_info}
                  onChange={(e) => setFeedback(prev => ({ ...prev, contact_info: e.target.value }))}
                  placeholder="Email or LinkedIn if you're open to follow-up discussions"
                  fullWidth
                  helperText="Only if you'd like to be contacted about opportunities or follow-up questions"
                />

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    This feedback helps demonstrate user engagement and provides valuable insights
                    for continuous improvement. All feedback is stored locally for demo purposes.
                  </Typography>
                </Alert>
              </Stack>
            )}
          </DialogContent>

          {!submitted && (
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!feedback.rating || !feedback.message.trim()}
                startIcon={<SendIcon />}
              >
                Submit Feedback
              </Button>
            </DialogActions>
          )}
        </Dialog>

        <Snackbar
          open={showSuccess}
          autoHideDuration={3000}
          onClose={() => setShowSuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setShowSuccess(false)} severity="success">
            Thank you for your feedback!
          </Alert>
        </Snackbar>
      </>
    );
  }
};

export default FeedbackWidget;