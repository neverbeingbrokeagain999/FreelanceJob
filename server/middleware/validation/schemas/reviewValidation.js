import { object, string, number, boolean } from 'yup';

export const createReviewSchema = object({
  jobId: string().required('Job ID is required'),
  rating: number().min(1).max(5).required('Rating is required'),
  comment: string().min(10).max(1000).required('Review comment is required'),
  communicationRating: number().min(1).max(5).required('Communication rating is required'),
  qualityRating: number().min(1).max(5).required('Quality rating is required'),
  timeline: number().min(1).max(5).required('Timeline rating is required'),
  isPublic: boolean().required('Visibility setting is required')
});

export const updateReviewSchema = object({
  rating: number().min(1).max(5),
  comment: string().min(10).max(1000),
  communicationRating: number().min(1).max(5),
  qualityRating: number().min(1).max(5),
  timeline: number().min(1).max(5),
  isPublic: boolean()
});

export const deleteReviewSchema = object({
  jobId: string().required('Job ID is required'),
  reviewId: string().required('Review ID is required')
});
