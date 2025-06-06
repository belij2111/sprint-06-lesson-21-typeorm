import { HttpStatus, INestApplication } from '@nestjs/common';
import { initSettings } from '../../helpers/init-settings';
import { BlogsTestManager } from '../../tests-managers/blogs.test-manager';
import { deleteAllData } from '../../helpers/delete-all-data';
import { PostsTestManager } from '../../tests-managers/posts.test-manager';
import { CreateBlogInputModel } from '../../../src/features/bloggers-platform/blogs/api/models/input/create-blog.input-model';
import { createValidBlogModel } from '../../models/bloggers-platform/blog.input-model';
import { createValidPostModel } from '../../models/bloggers-platform/post.input-model';
import { CommentsTestManager } from '../../tests-managers/comments.test-manager';
import {
  createInValidCommentModel,
  createValidCommentModel,
} from '../../models/bloggers-platform/comment.input-model';
import { CreateCommentInputModel } from '../../../src/features/bloggers-platform/comments/api/models/input/create-comment.input-model';
import { UsersTestManager } from '../../tests-managers/users.test-manager';
import { AuthTestManager } from '../../tests-managers/auth.test-manager';
import { CoreTestManager } from '../../tests-managers/core.test-manager';
import { BlogViewModel } from '../../../src/features/bloggers-platform/blogs/api/models/view/blog.view-model';
import { PostViewModel } from '../../../src/features/bloggers-platform/posts/api/models/view/post.view-model';
import { CommentViewModel } from '../../../src/features/bloggers-platform/comments/api/models/view/comment.view.model';
import { LoginSuccessViewModel } from '../../../src/features/user-accounts/auth/api/models/view/login-success.view-model';
import { delay } from '../../helpers/delay';
import { createLikeStatusModel } from '../../models/bloggers-platform/create-like-status.model';
import { getMockNumberId } from '../../helpers/get-mock-uuid-id';
import { LikeStatus } from '../../../src/features/bloggers-platform/likes/api/models/enums/like-status.enum';

describe('e2e-Comments', () => {
  let app: INestApplication;
  let blogsTestManager: BlogsTestManager;
  let postsTestManager: PostsTestManager;
  let usersTestManager: UsersTestManager;
  let authTestManager: AuthTestManager;
  let coreTestManager: CoreTestManager;
  let commentsTestManager: CommentsTestManager;
  let createdBlog: BlogViewModel;
  let createdPost: PostViewModel;
  let createdComment: CommentViewModel;
  let loginResult: LoginSuccessViewModel | undefined;

  beforeAll(async () => {
    const result = await initSettings();
    app = result.app;
    const coreConfig = result.coreConfig;
    blogsTestManager = new BlogsTestManager(app, coreConfig);
    postsTestManager = new PostsTestManager(app, coreConfig);
    usersTestManager = new UsersTestManager(app, coreConfig);
    authTestManager = new AuthTestManager(app, coreConfig);
    coreTestManager = new CoreTestManager(usersTestManager, authTestManager);
    commentsTestManager = new CommentsTestManager(app);
  });
  beforeEach(async () => {
    await deleteAllData(app);
    const validBlogModel: CreateBlogInputModel = createValidBlogModel();
    createdBlog = await blogsTestManager.createBlog(validBlogModel);
    const validPostModel = createValidPostModel(createdBlog.id);
    createdPost = await postsTestManager.createPost(validPostModel);
    await delay(3000);
    loginResult = await coreTestManager.loginUser();
    const validCommentModel: CreateCommentInputModel =
      createValidCommentModel();
    createdComment = await commentsTestManager.createComment(
      loginResult!.accessToken,
      createdPost.id,
      validCommentModel,
    );
  });
  afterEach(async () => {
    await deleteAllData(app);
  });
  afterAll(async () => {
    await app.close();
  });

  describe('GET/comments/:id', () => {
    it(`should return comment by ID : STATUS 200`, async () => {
      await commentsTestManager.getCommentById(
        createdComment.id,
        HttpStatus.OK,
      );
    });
    it(`shouldn't return comment by ID if it does not exist : STATUS 404`, async () => {
      const nonExistentId = getMockNumberId();
      await commentsTestManager.getCommentById(
        nonExistentId,
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('PUT/comment/:commentId', () => {
    it(`should update comment by commentId : STATUS 204`, async () => {
      const updatedCommentModel = createValidCommentModel(555);
      await commentsTestManager.update(
        loginResult!.accessToken,
        createdComment.id,
        updatedCommentModel,
        HttpStatus.NO_CONTENT,
      );
    });
    it(`shouldn't update comment with incorrect input data : STATUS 400`, async () => {
      const invalidUpdatedCommentModel = createInValidCommentModel(333);
      await commentsTestManager.update(
        loginResult!.accessToken,
        createdComment.id,
        invalidUpdatedCommentModel,
        HttpStatus.BAD_REQUEST,
      );
    });
    it(`shouldn't update comment if accessTokens expired : STATUS 401`, async () => {
      const updatedCommentModel = createValidCommentModel(555);
      await delay(10000);
      await commentsTestManager.update(
        loginResult!.accessToken,
        createdComment.id,
        updatedCommentModel,
        HttpStatus.UNAUTHORIZED,
      );
    });
    it(`shouldn't update comment if it belongs to another user : STATUS 403`, async () => {
      const updatedCommentModel = createValidCommentModel(555);
      loginResult = await coreTestManager.loginUser(2);
      await commentsTestManager.update(
        loginResult!.accessToken,
        createdComment.id,
        updatedCommentModel,
        HttpStatus.FORBIDDEN,
      );
    });
    it(`shouldn't update comment by commentId if it does not exist : STATUS 404`, async () => {
      const updatedCommentModel = createValidCommentModel(555);
      const nonExistentId = getMockNumberId();
      await commentsTestManager.update(
        loginResult!.accessToken,
        nonExistentId,
        updatedCommentModel,
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('DELETE/comment/:commentId', () => {
    it(`should delete comment by commentId : STATUS 204`, async () => {
      await commentsTestManager.delete(
        loginResult!.accessToken,
        createdComment.id,
        HttpStatus.NO_CONTENT,
      );
    });
    it(`shouldn't delete comment with if accessTokens expired : STATUS 401`, async () => {
      await delay(10000);
      await commentsTestManager.delete(
        loginResult!.accessToken,
        createdComment.id,
        HttpStatus.UNAUTHORIZED,
      );
    });
    it(`shouldn't delete comment if it belongs to another user : STATUS 403`, async () => {
      loginResult = await coreTestManager.loginUser(2);
      await commentsTestManager.delete(
        loginResult!.accessToken,
        createdComment.id,
        HttpStatus.FORBIDDEN,
      );
    });
    it(`shouldn't delete comment by commentId if it does not exist : STATUS 404`, async () => {
      const nonExistentId = getMockNumberId();
      await commentsTestManager.delete(
        loginResult!.accessToken,
        nonExistentId,
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('PUT/comment/:commentId/like-status', () => {
    it(`should update the like status for the comment : STATUS 204`, async () => {
      const updateLikeStatusModel = createLikeStatusModel(LikeStatus.Like);
      await commentsTestManager.updateLikeStatus(
        loginResult!.accessToken,
        createdComment.id,
        updateLikeStatusModel,
        HttpStatus.NO_CONTENT,
      );
    });
    it(`shouldn't update the like status with incorrect input data : STATUS 400`, async () => {
      const invalidUpdateLikeStatusModel = 'invalid like status';
      await commentsTestManager.updateLikeStatus(
        loginResult!.accessToken,
        createdComment.id,
        invalidUpdateLikeStatusModel,
        HttpStatus.BAD_REQUEST,
      );
    });
    it(`shouldn't update the like status if accessTokens expired : STATUS 401`, async () => {
      const updateLikeStatusModel = createLikeStatusModel(LikeStatus.Dislike);
      await delay(10000);
      await commentsTestManager.updateLikeStatus(
        loginResult!.accessToken,
        createdComment.id,
        updateLikeStatusModel,
        HttpStatus.UNAUTHORIZED,
      );
    });
    it(`shouldn't update the like status if the commentId does not exist : STATUS 404`, async () => {
      const updateLikeStatusModel = createLikeStatusModel(LikeStatus.None);
      const nonExistentId = getMockNumberId();
      await commentsTestManager.updateLikeStatus(
        loginResult!.accessToken,
        nonExistentId,
        updateLikeStatusModel,
        HttpStatus.NOT_FOUND,
      );
    });
  });
});
