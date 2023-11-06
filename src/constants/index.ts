export const SUBTITLES_LENGTH = 4;
export const JOB_MONSTER_TRANSCRIPTION = 'monster-transcription';
export const JOB_FILE_UPLOAD = 'upload';
export const JOB_TRIGGER = 'file-trigger';
export const JOB_PROGRESS = 'progress';
export const JOB_FAILURE = 'failed';
export const JOB_GENERATE_VIDEO = 'generate-video';
export const JOB_CLEAN_2_HOUR = 'clean-temp-2-hours';
export const JOB_CLEAN_EVERY_DAY = 'clean-temp-evey-day';

// status
export const PENDING_TRANSCRIBING = 'pending-transcribing';
export const COMPLETED = 'completed';
export const UPLOADED = 'uploaded';
export const DRAFT = 'draft';
export const PENDING_GENERATE = 'pending-generate';
export const TRANSCRIPTED = 'transcripted';

// message
export const MESSAGE_EXPORTING = 'Exporting';
export const MESSAGE_TRANSCRIBING = 'Transcribing';
export const MESSAGE_UPLOADING = 'Uploading';

// Job
export const DEFAULT_REMOVE_CONFIG = {
  attempts: 1,
  removeOnComplete: true,
  removeOnFail: true,
};
