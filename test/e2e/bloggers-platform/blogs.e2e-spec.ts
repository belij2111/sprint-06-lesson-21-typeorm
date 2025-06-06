import { HttpStatus, INestApplication } from '@nestjs/common';
import { initSettings } from '../../helpers/init-settings';
import {
  createInValidBlogModel,
  createValidBlogModel,
} from '../../models/bloggers-platform/blog.input-model';
import { CreateBlogInputModel } from '../../../src/features/bloggers-platform/blogs/api/models/input/create-blog.input-model';
import { BlogsTestManager } from '../../tests-managers/blogs.test-manager';
import { deleteAllData } from '../../helpers/delete-all-data';
import {
  createInValidPostModel,
  createValidPostModel,
} from '../../models/bloggers-platform/post.input-model';
import { PostsTestManager } from '../../tests-managers/posts.test-manager';
import { getMockNumberId } from '../../helpers/get-mock-uuid-id';

describe('e2e-Blogs', () => {
  let app: INestApplication;
  let blogsTestManager: BlogsTestManager;
  let postsTestManager: PostsTestManager;

  beforeAll(async () => {
    const result = await initSettings();
    app = result.app;
    const coreConfig = result.coreConfig;
    blogsTestManager = new BlogsTestManager(app, coreConfig);
    postsTestManager = new PostsTestManager(app, coreConfig);
  });
  beforeEach(async () => {
    await deleteAllData(app);
  });
  afterEach(async () => {
    await deleteAllData(app);
  });
  afterAll(async () => {
    await app.close();
  });

  describe('GET/blogs', () => {
    it(`should return blogs with paging : STATUS 200`, async () => {
      const createdBlogs = await blogsTestManager.createBlogs(2);
      const createdResponse = await blogsTestManager.getBlogsWithPaging(
        HttpStatus.OK,
      );
      blogsTestManager.expectCorrectPagination(
        createdBlogs,
        createdResponse.body,
      );
      // console.log('createdResponse.body :', createdResponse.body);
    });
  });

  describe('POST/blogs', () => {
    it(`should create new blog : STATUS 201`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel();
      // console.log('validBlogModel :', validBlogModel);
      const createdResponse = await blogsTestManager.createBlog(validBlogModel);
      console.log('createdResponse :', createdResponse);
      blogsTestManager.expectCorrectModel(validBlogModel, createdResponse);
    });
    it(`shouldn't create new blog with incorrect input data : STATUS 400`, async () => {
      const invalidBlogModel: CreateBlogInputModel =
        createInValidBlogModel(777);
      // console.log('invalidBlogModel :', invalidBlogModel);
      await blogsTestManager.createBlog(
        invalidBlogModel,
        HttpStatus.BAD_REQUEST,
      );
    });
    it(`shouldn't create new blog if the request is unauthorized : STATUS 401`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel();
      // console.log('validBlogModel :', validBlogModel);
      await blogsTestManager.createBlogIsNotAuthorized(
        validBlogModel,
        HttpStatus.UNAUTHORIZED,
      );
    });
  });

  describe('GET/blogs/:id', () => {
    it(`should return blog by ID : STATUS 200`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel();
      const createdBlog = await blogsTestManager.createBlog(validBlogModel);
      //console.log('createdBlog :', createdBlog);
      await blogsTestManager.getBlogById(createdBlog.id, HttpStatus.OK);
    });
    it(`shouldn't return blog by ID if it does not exist : STATUS 404`, async () => {
      const nonExistentId = getMockNumberId();
      await blogsTestManager.getBlogById(nonExistentId, HttpStatus.NOT_FOUND);
    });
  });

  describe('PUT/blogs/:id', () => {
    it(`should update blog by ID : STATUS 204`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel(1);
      const createdBlog = await blogsTestManager.createBlog(validBlogModel);
      const updatedBlogModel: CreateBlogInputModel = createValidBlogModel(555);
      // console.log('updatedBlogModel :', updatedBlogModel);
      await blogsTestManager.updateBlog(
        createdBlog.id,
        updatedBlogModel,
        HttpStatus.NO_CONTENT,
      );
    });
    it(`shouldn't update blog by ID with incorrect input data : STATUS 400`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel(1);
      const createdBlog = await blogsTestManager.createBlog(validBlogModel);
      const invalidUpdatedBlogModel: CreateBlogInputModel =
        createInValidBlogModel(0);
      await blogsTestManager.updateBlog(
        createdBlog.id,
        invalidUpdatedBlogModel,
        HttpStatus.BAD_REQUEST,
      );
    });
    it(`shouldn't update blog by ID if the request is unauthorized: STATUS 401`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel(1);
      const createdBlog = await blogsTestManager.createBlog(validBlogModel);
      const updatedBlogModel: CreateBlogInputModel = createValidBlogModel(555);
      await blogsTestManager.updateBlogIsNotAuthorized(
        createdBlog.id,
        updatedBlogModel,
        HttpStatus.UNAUTHORIZED,
      );
    });
    it(`shouldn't update blog by ID if it does not exist : STATUS 404`, async () => {
      const updatedBlogModel: CreateBlogInputModel = createValidBlogModel(555);
      const nonExistentId = getMockNumberId();
      await blogsTestManager.updateBlog(
        nonExistentId,
        updatedBlogModel,
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('DELETE/blogs/:id', () => {
    it(`should delete blog by ID : STATUS 204`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel(1);
      const createdBlog = await blogsTestManager.createBlog(validBlogModel);
      await blogsTestManager.deleteById(createdBlog.id, HttpStatus.NO_CONTENT);
    });
    it(`shouldn't delete blog by ID if the request is unauthorized : STATUS 401`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel(1);
      const createdBlog = await blogsTestManager.createBlog(validBlogModel);
      await blogsTestManager.deleteByIdIsNotAuthorized(
        createdBlog.id,
        HttpStatus.UNAUTHORIZED,
      );
    });
    it(`shouldn't delete blog by ID if it does not exist : STATUS 404`, async () => {
      const nonExistentId = getMockNumberId();
      await blogsTestManager.deleteById(nonExistentId, HttpStatus.NOT_FOUND);
    });
  });

  describe('POST/blogs/:blogId/posts', () => {
    it(`should create a post for the specified blog : STATUS 201`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel();
      const createdBlog = await blogsTestManager.createBlog(validBlogModel);
      const validPostModel = createValidPostModel(createdBlog.id);
      const createdResponse = await blogsTestManager.createPostByBlogId(
        createdBlog.id,
        validPostModel,
        HttpStatus.CREATED,
      );
      //console.log(createdResponse);
      postsTestManager.expectCorrectModel(validPostModel, createdResponse);
    });
    it(`shouldn't create a post with incorrect input data : STATUS 400`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel();
      const createdBlog = await blogsTestManager.createBlog(validBlogModel);
      const inValidPostModel = createInValidPostModel(createdBlog.id);
      await blogsTestManager.createPostByBlogId(
        createdBlog.id,
        inValidPostModel,
        HttpStatus.BAD_REQUEST,
      );
    });
    it(`shouldn't create a post if the request is unauthorized : STATUS 401`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel();
      const createdBlog = await blogsTestManager.createBlog(validBlogModel);
      const validPostModel = createValidPostModel(createdBlog.id);
      await blogsTestManager.createPostByBlogIdIsNotAuthorized(
        createdBlog.id,
        validPostModel,
        HttpStatus.UNAUTHORIZED,
      );
    });
    it(`shouldn't create a post if the blogId does not exist : STATUS 404`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel();
      const createdBlog = await blogsTestManager.createBlog(validBlogModel);
      const validPostModel = createValidPostModel(createdBlog.id);
      const nonExistentId = getMockNumberId();
      await blogsTestManager.createPostByBlogId(
        nonExistentId,
        validPostModel,
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('GET/blogs/:blogId/posts', () => {
    it(`should return all posts for the specified blog : STATUS 200`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel();
      const createdBlog = await blogsTestManager.createBlog(validBlogModel);
      const createdPosts = await postsTestManager.createPosts(
        createdBlog.id,
        5,
      );
      const createdResponse = await blogsTestManager.getPostsByBlogId(
        createdBlog.id,
        HttpStatus.OK,
      );
      postsTestManager.expectCorrectPagination(
        createdPosts,
        createdResponse.body,
      );
      //console.log('createdResponse.body :', createdResponse.body);
    });
    it(`shouldn't return posts if the blogId does not exist : STATUS 404`, async () => {
      const validBlogModel: CreateBlogInputModel = createValidBlogModel();
      const createdBlog = await blogsTestManager.createBlog(validBlogModel);
      await postsTestManager.createPosts(createdBlog.id, 5);
      const nonExistentId = getMockNumberId();
      await blogsTestManager.getPostsByBlogId(
        nonExistentId,
        HttpStatus.NOT_FOUND,
      );
    });
  });
});
