import { Router } from 'express';
import {
  generateCampaign,
  generateCharacter,
  generateQuest
} from '../controllers/generateController.js';

const router = Router();

router.post('/generate-campaign', generateCampaign);
router.post('/generate-character', generateCharacter);
router.post('/generate-quest', generateQuest);

export default router;
