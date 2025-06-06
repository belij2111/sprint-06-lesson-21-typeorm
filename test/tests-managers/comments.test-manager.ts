import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CreateCommentInputModel } from '../../src/features/bloggers-platform/comments/api/models/input/create-comment.input-model';
import { CommentViewModel } from '../../src/features/bloggers-platform/comments/api/models/view/comment.view.model';
import { paginationParams } from '../models/base/pagination.model';
import { Paginator } from '../../src/core/models/pagination-base.model';
import { createValidCommentModel } from '../models/bloggers-platform/comment.input-model';
import { LikeInputModel } from '../../src/features/bloggers-platform/likes/api/models/input/like.input-model';

export class CommentsTestManager {
  constructor(private readonly app: INestApplication) {}

  async createComment(
    accessToken: string,
    postId: number,
    createdModel: CreateCommentInputModel,
    statusCode: number = HttpStatus.CREATED,
  ) {
    const response = await request(this.app.getHttpServer())
      .post(`/posts/${postId}/comments`)
      .auth(accessToken, { type: 'bearer' })
      .send(createdModel)
      .expect(statusCode);
    return response.body;
  }

  expectCorrectModel(
    createdModel: CreateCommentInputModel,
    responseModel: CommentViewModel,
  ) {
    expect(createdModel.content).toBe(responseModel.content);
  }

  async createComments(
    accessToken: string,
    postId: number,
    count: number,
    statusCode: number = HttpStatus.CREATED,
  ) {
    const comments: CommentViewModel[] = [];
    for (let i = 1; i <= count; i++) {
      const response = await request(this.app.getHttpServer())
        .post(`/posts/${postId}/comments`)
        .auth(accessToken, { type: 'bearer' })
        .send(createValidCommentModel(i))
        .expect(statusCode);
      comments.push(response.body);
    }
    return comments;
  }

  async getCommentsWithPaging(
    postId: number,
    statusCode: number = HttpStatus.OK,
  ) {
    const { pageNumber, pageSize, sortBy, sortDirection } = paginationParams;
    return request(this.app.getHttpServer())
      .get(`/posts/${postId}/comments`)
      .query({
        pageNumber,
        pageSize,
        sortBy,
        sortDirection,
      })
      .expect(statusCode);
  }

  expectCorrectPagination(
    createModels: CreateCommentInputModel[],
    responseModels: Paginator<CommentViewModel[]>,
  ) {
    expect(responseModels.items.length).toBe(createModels.length);
    expect(responseModels.totalCount).toBe(createModels.length);
    expect(responseModels.items).toEqual(createModels);
    expect(responseModels.pagesCount).toBe(1);
    expect(responseModels.page).toBe(1);
    expect(responseModels.pageSize).toBe(10);
  }

  async getCommentById(id: number, statusCode: number = HttpStatus.OK) {
    const response = await request(this.app.getHttpServer())
      .get('/comments/' + id)
      .expect(statusCode);
    return response.body;
  }

  async update(
    accessToken: string,
    commentId: number,
    createdModel: CreateCommentInputModel,
    statusCode: number = HttpStatus.NO_CONTENT,
  ) {
    await request(this.app.getHttpServer())
      .put(`/comments/${commentId}`)
      .auth(accessToken, { type: 'bearer' })
      .send(createdModel)
      .expect(statusCode);
  }

  async delete(
    accessToken: string,
    commentId: number,
    statusCode: number = HttpStatus.NO_CONTENT,
  ) {
    await request(this.app.getHttpServer())
      .delete(`/comments/${commentId}`)
      .auth(accessToken, { type: 'bearer' })
      .expect(statusCode);
  }

  async updateLikeStatus(
    accessToken: string,
    commentId: number,
    createdModel: LikeInputModel | string,
    statusCode: number = HttpStatus.NO_CONTENT,
  ) {
    await request(this.app.getHttpServer())
      .put(`/comments/${commentId}/like-status`)
      .auth(accessToken, { type: 'bearer' })
      .send(createdModel)
      .expect(statusCode);
  }
}
