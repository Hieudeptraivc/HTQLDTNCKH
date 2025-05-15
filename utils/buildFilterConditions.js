exports.buildFilterConditions = (queryString, searchFields) => {
  const { sort, page, limit, fields, keyword, ...queryObj } = queryString;
  const filterObj = {};

  if (keyword && searchFields.length > 0) {
    filterObj.$or = searchFields.map((f) => ({
      [f]: { $regex: keyword, $options: 'i' },
    }));
  }

  const parsedQuery = JSON.parse(
    JSON.stringify(queryObj).replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`,
    ),
  );

  Object.assign(filterObj, parsedQuery);
  return filterObj;
};
