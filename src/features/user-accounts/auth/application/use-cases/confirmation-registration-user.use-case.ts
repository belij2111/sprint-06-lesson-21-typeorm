import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { RegistrationConfirmationCodeInputModel } from '../../api/models/input/registration-confirmation-code.input-model';
import { UsersRepository } from '../../../users/infrastructure/users.repository';

export class ConfirmationRegistrationUserCommand {
  constructor(public inputCode: RegistrationConfirmationCodeInputModel) {}
}

@CommandHandler(ConfirmationRegistrationUserCommand)
export class ConfirmationRegistrationUserUseCase
  implements ICommandHandler<ConfirmationRegistrationUserCommand, void>
{
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(command: ConfirmationRegistrationUserCommand): Promise<void> {
    const confirmedUser = await this.usersRepository.findByConfirmationCode(
      command.inputCode.code,
    );
    if (!confirmedUser) {
      throw new BadRequestException([
        { field: 'code', message: 'Confirmation code is incorrect' },
      ]);
    }
    if (confirmedUser.isConfirmed) {
      throw new BadRequestException([
        {
          field: 'code',
          message: 'Code already confirmed',
        },
      ]);
    }
    const isConfirmed = true;
    confirmedUser.update({ isConfirmed: isConfirmed });
    await this.usersRepository.updateRegistrationConfirmation(confirmedUser);
  }
}
