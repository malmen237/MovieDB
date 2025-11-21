import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { MIN_YEAR, MAX_YEAR_OFFSET } from './constants';

// Handle validation errors
export const handleValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// Media validators
export const validateMediaCreate = [
  body('type').isIn(['movie', 'tv-series']).withMessage('Type must be movie or tv-series'),
  body('originalTitle').trim().notEmpty().withMessage('Original title is required'),
  body('format').isIn(['bluray', 'dvd', 'other']).withMessage('Format must be bluray, dvd, or other'),
  body('productionYear').isInt({ min: MIN_YEAR, max: new Date().getFullYear() + MAX_YEAR_OFFSET }).withMessage('Invalid production year'),
  body('swedishTitle').optional().trim(),
  body('company').optional().trim(),
  body('director').optional().trim(),
  body('extras').optional().trim(),
  body('partOf').optional().trim(),
  body('overview').optional().trim(),
  handleValidation
];

export const validateMediaUpdate = [
  param('id').isInt().withMessage('ID must be an integer'),
  body('type').optional().isIn(['movie', 'tv-series']),
  body('originalTitle').optional().trim().notEmpty(),
  body('format').optional().isIn(['bluray', 'dvd', 'other']),
  body('productionYear').optional().isInt({ min: MIN_YEAR, max: new Date().getFullYear() + MAX_YEAR_OFFSET }),
  handleValidation
];

export const validateId = [
  param('id').isInt().withMessage('ID must be an integer'),
  handleValidation
];

export const validateSearch = [
  query('type').optional().isIn(['movie', 'tv-series']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  handleValidation
];

export const validateTMDBSearch = [
  query('q').trim().notEmpty().withMessage('Query parameter required'),
  query('type').optional().isIn(['movie', 'tv']),
  handleValidation
];

export const validateTMDBDetails = [
  param('type').isIn(['movie', 'tv']).withMessage('Type must be movie or tv'),
  param('id').isInt().withMessage('ID must be an integer'),
  handleValidation
];
