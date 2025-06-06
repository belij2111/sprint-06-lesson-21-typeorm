import { HttpStatus, INestApplication } from '@nestjs/common';
import { UsersTestManager } from '../../tests-managers/users.test-manager';
import { initSettings } from '../../helpers/init-settings';
import { deleteAllData } from '../../helpers/delete-all-data';
import { CreateUserInputModel } from '../../../src/features/user-accounts/users/api/models/input/create-user.input-model';
import {
  createInValidUserModel,
  createSeveralUsersModels,
  createValidUserModel,
} from '../../models/user-accounts/user.input-model';
import { AuthTestManager } from '../../tests-managers/auth.test-manager';
import { delay } from '../../helpers/delay';
import {
  createEmailResendingInputModel,
  createInvalidEmailResendingInputModel,
} from '../../models/user-accounts/email-resending.input-model';
import {
  createInvalidRegistrationConfirmationCodeInputModel,
  createRegistrationConfirmationCodeInputModel,
} from '../../models/user-accounts/registration-confirmation-code.input-model';
import {
  createInvalidPasswordRecoveryInputModel,
  createPasswordRecoveryInputModel,
} from '../../models/user-accounts/password-recovery.input-model';
import {
  createInvalidNewPasswordRecoveryInputModel,
  createNewPasswordRecoveryInputModel,
} from '../../models/user-accounts/new-password-recovery.input-model';
import { SendEmailConfirmationWhenRegisteringUserEventHandlerMock } from '../../mock/send-email-confirmation-when-registering-user-event-handler.mock';
import { SendEmailConfirmationWhenRegisteringUserEventHandler } from '../../../src/features/notifications/event-handlers/send-email-confirmation-when-registering-user.event-handler';
import { SendEmailWithRecoveryCodeEventHandlerMock } from '../../mock/send-email-with-recovery-code-event-handler.mock';
import { SendEmailWithRecoveryCodeEventHandler } from '../../../src/features/notifications/event-handlers/send-email-with-recovery-code.event-handler';

describe('e2e-Auth', () => {
  let app: INestApplication;
  let usersTestManager: UsersTestManager;
  let authTestManager: AuthTestManager;
  let sendEmailConfirmationWhenRegisteringUserEventHandlerMock: SendEmailConfirmationWhenRegisteringUserEventHandlerMock;
  let sendEmailWithRecoveryCodeEventHandlerMock: SendEmailWithRecoveryCodeEventHandlerMock;
  beforeEach(async () => {
    const result = await initSettings([
      {
        service: SendEmailConfirmationWhenRegisteringUserEventHandler,
        serviceMock: SendEmailConfirmationWhenRegisteringUserEventHandlerMock,
      },
      {
        service: SendEmailWithRecoveryCodeEventHandler,
        serviceMock: SendEmailWithRecoveryCodeEventHandlerMock,
      },
    ]);
    app = result.app;
    const coreConfig = result.coreConfig;
    usersTestManager = new UsersTestManager(app, coreConfig);
    authTestManager = new AuthTestManager(app, coreConfig);
    sendEmailConfirmationWhenRegisteringUserEventHandlerMock = app.get(
      SendEmailConfirmationWhenRegisteringUserEventHandler,
    );
    sendEmailWithRecoveryCodeEventHandlerMock = app.get(
      SendEmailWithRecoveryCodeEventHandler,
    );
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
  describe('POST/auth/login', () => {
    it(`should login user to the system : STATUS 200`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await usersTestManager.createUser(validUserModel);
      const createdResponse = await authTestManager.loginUser(
        validUserModel,
        HttpStatus.OK,
      );
      // console.log('createdResponse.accessToken :', createdResponse.accessToken);
      // console.log('createdResponse.refreshToken :', createdResponse.refreshToken);
      authTestManager.expectCorrectLoginUser(createdResponse);
    });
    it(`shouldn't login user to the system if the password or login is wrong : STATUS 401`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await usersTestManager.createUser(validUserModel);
      const invalidUserModel: CreateUserInputModel = createInValidUserModel();
      await authTestManager.loginUser(
        invalidUserModel,
        HttpStatus.UNAUTHORIZED,
      );
    });

    it(`should restrict login if the limit is exceeded : STATUS 429`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await usersTestManager.createUser(validUserModel);
      const createdResponse = await authTestManager.loginWithRateLimit(
        validUserModel,
        6,
      );
      // console.log('createdResponse :', createdResponse);
      authTestManager.expectTooManyRequests(createdResponse);
    });
  });

  describe('POST/auth/refresh-token', () => {
    it(`should generate a new pair of tokens : STATUS 200`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await usersTestManager.createUser(validUserModel);
      const loginResult = await authTestManager.loginUser(validUserModel);
      const createdResponse = await authTestManager.refreshToken(
        loginResult!.refreshToken,
        HttpStatus.OK,
      );
      // console.log('createdResponse.accessToken :', createdResponse.accessToken);
      // console.log('createdResponse.refreshToken :', createdResponse.refreshToken);
      authTestManager.expectCorrectLoginUser(createdResponse);
    });
    it(`shouldn't generate a new pair of tokens if refreshToken expired : STATUS 401`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await usersTestManager.createUser(validUserModel);
      const loginResult = await authTestManager.loginUser(validUserModel);
      await delay(20000);
      await authTestManager.refreshToken(
        loginResult!.refreshToken,
        HttpStatus.UNAUTHORIZED,
      );
    });
  });

  describe('GET/auth/me', () => {
    it(`should return users info with correct accessTokens : STATUS 200`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      const createdUser = await usersTestManager.createUser(validUserModel);
      const loginResult = await authTestManager.loginUser(validUserModel);
      const createdResponse = await authTestManager.me(
        loginResult!.accessToken,
        HttpStatus.OK,
      );
      // console.log('createdResponse :', createdResponse);
      authTestManager.expectCorrectMe(createdUser, createdResponse);
    });
    it(`shouldn't return users info with if accessTokens expired : STATUS 401`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await usersTestManager.createUser(validUserModel);
      const loginResult = await authTestManager.loginUser(validUserModel);
      await delay(10000);
      await authTestManager.me(
        loginResult!.accessToken,
        HttpStatus.UNAUTHORIZED,
      );
    });
  });

  describe('POST/auth/registration', () => {
    it(`should register user in system : STATUS 204`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      const sendEmailSpy = jest.spyOn(
        sendEmailConfirmationWhenRegisteringUserEventHandlerMock,
        'handle',
      );
      await authTestManager.registration(validUserModel, HttpStatus.NO_CONTENT);
      authTestManager.expectCorrectSendEmail(sendEmailSpy, validUserModel);
    });
    it(`shouldn't register user in system with incorrect input data : STATUS 400`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel(7);
      await usersTestManager.createUser(validUserModel);
      await authTestManager.registration(
        validUserModel,
        HttpStatus.BAD_REQUEST,
      );
    });
    it(`shouldn't register user in system if the limit is exceeded : STATUS 429`, async () => {
      const createdUsersModels: CreateUserInputModel[] =
        createSeveralUsersModels(6);
      const createdResponse =
        await authTestManager.registrationWithRateLimit(createdUsersModels);
      // console.log('createdResponse : ', createdResponse);
      authTestManager.expectTooManyRequests(createdResponse);
    });
    it(`should delete the registered user by ID : STATUS 204`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel, HttpStatus.NO_CONTENT);
      const fondUsers = await usersTestManager.getUsersWithPaging(
        HttpStatus.OK,
      );
      // console.log(fondUsers.body.items[0].id);
      await usersTestManager.deleteById(
        fondUsers.body.items[0].id,
        HttpStatus.NO_CONTENT,
      );
    });
  });

  describe('POST/auth/registration-confirmation', () => {
    it(`should confirm the user's registration in system : STATUS 204`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel, HttpStatus.NO_CONTENT);
      const confirmationCode =
        sendEmailConfirmationWhenRegisteringUserEventHandlerMock.sentEmails[0]
          .code;
      const confirmationCodeModel =
        createRegistrationConfirmationCodeInputModel(confirmationCode);
      // console.log('mailServiceMock.sentEmails :', mailServiceMock.sentEmails);
      await authTestManager.registrationConfirmation(
        confirmationCodeModel,
        HttpStatus.NO_CONTENT,
      );
    });
    it(`shouldn't confirm the user's registration with incorrect input data : STATUS 400`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel, HttpStatus.NO_CONTENT);
      const invalidConfirmationCode =
        createInvalidRegistrationConfirmationCodeInputModel();
      await authTestManager.registrationConfirmation(
        invalidConfirmationCode,
        HttpStatus.BAD_REQUEST,
      );
    });
    it(`shouldn't confirm the user's registration if the limit is exceeded : STATUS 429`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel, HttpStatus.NO_CONTENT);
      const confirmationCode =
        sendEmailConfirmationWhenRegisteringUserEventHandlerMock.sentEmails[0]
          .code;
      const confirmationCodeModel =
        createRegistrationConfirmationCodeInputModel(confirmationCode);
      const createdResponse =
        await authTestManager.registrationConfirmationWithRateLimit(
          confirmationCodeModel,
          6,
        );
      authTestManager.expectTooManyRequests(createdResponse);
    });
  });

  describe('POST/auth/registration-email-resending', () => {
    it(`should resend confirmation registration by email : STATUS 204`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      const sendEmailSpy = jest.spyOn(
        sendEmailConfirmationWhenRegisteringUserEventHandlerMock,
        'handle',
      );
      await authTestManager.registration(validUserModel);
      const emailResendingModel =
        createEmailResendingInputModel(validUserModel);
      await authTestManager.registrationEmailResending(
        emailResendingModel,
        HttpStatus.NO_CONTENT,
      );
      authTestManager.expectCorrectSendEmail(sendEmailSpy, validUserModel, 2);
    });
    it(`shouldn't resend confirmation registration with incorrect input data : STATUS 400 `, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel, HttpStatus.NO_CONTENT);
      const invalidEmailResendingModel =
        createInvalidEmailResendingInputModel();
      await authTestManager.registrationEmailResending(
        invalidEmailResendingModel,
        HttpStatus.BAD_REQUEST,
      );
    });
    it(`shouldn't resend confirmation registration if the limit is exceeded : STATUS 429`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel);
      const emailResendingModel =
        createEmailResendingInputModel(validUserModel);
      const createdResponse =
        await authTestManager.registrationEmailResendingWithRateLimit(
          emailResendingModel,
          6,
        );
      authTestManager.expectTooManyRequests(createdResponse);
    });
  });

  describe('POST/auth/password-recovery', () => {
    it(`should recover password via email confirmation : STATUS 204`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      const sendEmailSpy = jest.spyOn(
        sendEmailWithRecoveryCodeEventHandlerMock,
        'handle',
      );
      await authTestManager.registration(validUserModel, HttpStatus.NO_CONTENT);
      const passwordRecoveryModel =
        createPasswordRecoveryInputModel(validUserModel);
      await authTestManager.passwordRecovery(
        passwordRecoveryModel,
        HttpStatus.NO_CONTENT,
      );
      authTestManager.expectCorrectSendEmail(sendEmailSpy, validUserModel, 1);
    });
    it(`shouldn't recover password with incorrect input data : STATUS 400 `, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel);
      const invalidPasswordRecoveryModel =
        createInvalidPasswordRecoveryInputModel();
      await authTestManager.passwordRecovery(
        invalidPasswordRecoveryModel,
        HttpStatus.BAD_REQUEST,
      );
    });
    it(`shouldn't recover password if the limit is exceeded : STATUS 429 `, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel);
      const passwordRecoveryModel =
        createPasswordRecoveryInputModel(validUserModel);
      const createdResponse =
        await authTestManager.passwordRecoveryWithRateLimit(
          passwordRecoveryModel,
          6,
        );
      authTestManager.expectTooManyRequests(createdResponse);
    });
  });

  describe('POST/auth/new-password', () => {
    it(`should confirm password recovery : STATUS 204`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel);
      const recoveryCode =
        sendEmailConfirmationWhenRegisteringUserEventHandlerMock.sentEmails[0]
          .code;
      const newPasswordRecoveryModel =
        createNewPasswordRecoveryInputModel(recoveryCode);
      await authTestManager.newPassword(
        newPasswordRecoveryModel,
        HttpStatus.NO_CONTENT,
      );
    });
    it(`shouldn't confirm password recovery with incorrect input data : STATUS 400`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel);
      const invalidNewPasswordRecoveryModel =
        createInvalidNewPasswordRecoveryInputModel();
      await authTestManager.newPassword(
        invalidNewPasswordRecoveryModel,
        HttpStatus.BAD_REQUEST,
      );
    });
    it(`shouldn't confirm password recovery if the limit is exceeded : STATUS 429`, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel);
      const recoveryCode =
        sendEmailConfirmationWhenRegisteringUserEventHandlerMock.sentEmails[0]
          .code;
      const newPasswordRecoveryModel =
        createNewPasswordRecoveryInputModel(recoveryCode);
      const createdResponse = await authTestManager.newPasswordWithRateLimit(
        newPasswordRecoveryModel,
        6,
      );
      authTestManager.expectTooManyRequests(createdResponse);
    });
  });

  describe('POST/auth/logout', () => {
    it(`should clear the user session and log out  : STATUS 204 `, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel);
      const loginResult = await authTestManager.loginUser(validUserModel);
      const refreshToken = loginResult!.refreshToken;
      await authTestManager.logout(refreshToken, HttpStatus.NO_CONTENT);
    });
    it(`shouldn't clear the user session and log out if refreshToken expired  : STATUS 401 `, async () => {
      const validUserModel: CreateUserInputModel = createValidUserModel();
      await authTestManager.registration(validUserModel);
      const loginResult = await authTestManager.loginUser(validUserModel);
      const refreshToken = loginResult!.refreshToken;
      await delay(20000);
      await authTestManager.logout(refreshToken, HttpStatus.UNAUTHORIZED);
    });
  });
});
