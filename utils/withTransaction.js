const mongoose = require('mongoose');

const withTransaction = async (callback) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error; // Ném lỗi để catchAsync xử lý
  } finally {
    session.endSession();
  }
};

module.exports = withTransaction;
