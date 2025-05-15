class APIFeatures {
  constructor(query, queryString, searchFields) {
    this.query = query;
    this.queryString = queryString;
    this.searchFields = searchFields;
  }

  filter(excludeFields = []) {
    const { sort, page, limit, fields, keyword, ...queryObj } =
      this.queryString;

    const filterObj = {};

    // Nếu có keyword => thêm điều kiện $or
    if (keyword && this.searchFields.length > 0) {
      filterObj.$or = this.searchFields.map((f) => ({
        [f]: { $regex: keyword, $options: 'i' },
      }));
    }

    // Loại bỏ các trường không mong muốn
    excludeFields.forEach((field) => {
      delete queryObj[field];
    });

    // Parse các filter còn lại
    const parsedQuery = JSON.parse(
      JSON.stringify(queryObj).replace(
        /\b(gte|gt|lte|lt)\b/g,
        (match) => `$${match}`,
      ),
    );

    Object.assign(filterObj, parsedQuery);

    this.query = this.query.find(filterObj);

    return this;
  }

  sort() {
    const { sort } = this.queryString;
    this.query = sort ? this.query.sort(sort) : this.query.sort('-_id');
    return this;
  }

  limitFields() {
    const { fields } = this.queryString;
    this.query = fields ? this.query.select(fields) : this.query.select('-__v');
    return this;
  }

  pagination() {
    const { page, limit } = this.queryString;
    const skip = ((+page || 1) - 1) * (+limit || 100);
    this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
