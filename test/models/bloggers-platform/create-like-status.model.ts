import { LikeInputModel } from '../../../src/features/bloggers-platform/likes/api/models/input/like.input-model';

import { LikeStatus } from '../../../src/features/bloggers-platform/likes/api/models/enums/like-status.enum';

export const createLikeStatusModel = (
  likeStatus: LikeStatus,
): LikeInputModel => {
  const likeModel = new LikeInputModel();
  likeModel.likeStatus = likeStatus;
  return likeModel;
};
