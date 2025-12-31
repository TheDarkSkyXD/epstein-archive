import { Router } from 'express';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { InvestigativeTaskService } from '../../services/InvestigativeTaskService.js';

const router = Router();
const taskService = new InvestigativeTaskService();

// Get all tasks with optional filters
router.get('/', authenticateRequest, async (req, res, next) => {
  try {
    const filters = {
      investigationId: req.query.investigationId ? parseInt(req.query.investigationId as string) : undefined,
      status: req.query.status as string,
      priority: req.query.priority as string,
      assignedTo: req.query.assignedTo as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    const result = await taskService.getTasks(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get a specific task by ID
router.get('/:id', authenticateRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const taskId = parseInt(id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const task = await taskService.getTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Create a new task
router.post('/', authenticateRequest, async (req, res, next) => {
  try {
    const { investigationId, title, description, priority, assignedTo, dueDate, evidenceIds, relatedEntities } = req.body;
    
    if (!investigationId || !title) {
      return res.status(400).json({ error: 'Investigation ID and title are required' });
    }
    
    const newTask = await taskService.createTask({
      investigationId,
      title,
      description,
      priority,
      assignedTo,
      dueDate,
      createdById: (req as any).user?.id || 'system',
      evidenceIds,
      relatedEntities
    });
    
    res.status(201).json(newTask);
  } catch (error) {
    next(error);
  }
});

// Update a task
router.put('/:id', authenticateRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const taskId = parseInt(id);
    const updates = req.body;
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const updatedTask = await taskService.updateTask(taskId, updates);
    
    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
});

// Delete a task
router.delete('/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const taskId = parseInt(id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const success = await taskService.deleteTask(taskId);
    
    if (!success) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get tasks by investigation
router.get('/investigation/:investigationId', authenticateRequest, async (req, res, next) => {
  try {
    const { investigationId } = req.params;
    const id = parseInt(investigationId);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid investigation ID' });
    }
    
    const tasks = await taskService.getTasksByInvestigation(id);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// Get task summary for an investigation
router.get('/summary/:investigationId', authenticateRequest, async (req, res, next) => {
  try {
    const { investigationId } = req.params;
    const id = parseInt(investigationId);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid investigation ID' });
    }
    
    const summary = await taskService.getTaskSummary(id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Update task progress
router.patch('/:id/progress', authenticateRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const taskId = parseInt(id);
    const { progress } = req.body;
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'Progress must be a number between 0 and 100' });
    }
    
    const updatedTask = await taskService.updateTaskProgress(taskId, progress);
    
    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
});

// Get urgent tasks for the current user
router.get('/urgent/:userId?', authenticateRequest, async (req, res, next) => {
  try {
    const userId = req.params.userId || (req as any).user?.id;
    const tasks = await taskService.getUrgentTasks(userId);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

export default router;