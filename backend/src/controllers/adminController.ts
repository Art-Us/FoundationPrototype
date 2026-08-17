import { Response } from 'express';
import { User, Organization } from '../models';
import { AuthenticatedRequest } from '../middleware/protect';

/**
 * @desc    Pobiera listę użytkowników oczekujących na weryfikację (isVerified: false)
 * @route   GET /api/admin/users/pending
 * @access  Private (wymaga protect i adminOnly)
 */
export const getPendingUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const pendingUsers = await User.findAll({
      where: { isVerified: false },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Organization,
          as: 'organization',
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: pendingUsers.length,
      data: pendingUsers,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania użytkowników oczekujących na weryfikację.',
      error: error.message,
    });
  }
};

/**
 * @desc    Weryfikuje użytkownika (zmienia isVerified na true)
 * @route   PATCH /api/admin/users/:id/verify
 * @access  Private (wymaga protect i adminOnly)
 */
export const verifyUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Użytkownik o podanym identyfikatorze nie został znaleziony.',
      });
      return;
    }

    user.isVerified = true;
    await user.save();

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Organization,
          as: 'organization',
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Użytkownik został pomyślnie zweryfikowany.',
      data: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas weryfikacji użytkownika.',
      error: error.message,
    });
  }
};

/**
 * @desc    Odrzuca weryfikację użytkownika (usuwa konto oczekujące)
 * @route   DELETE /api/admin/users/:id/reject
 * @access  Private (wymaga protect i adminOnly)
 */
export const rejectUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Użytkownik o podanym identyfikatorze nie został znaleziony.',
      });
      return;
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: 'Wniosek o rejestrację został odrzucony, a konto usunięte.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas odrzucania użytkownika.',
      error: error.message,
    });
  }
};
