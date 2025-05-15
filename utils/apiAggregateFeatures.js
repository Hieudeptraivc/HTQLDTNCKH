class APIAggregateFeatures {
  constructor(pipeline, queryString, searchFields) {
    this.pipeline = pipeline;
    this.queryString = queryString;
    this.searchFields = searchFields;
  }

  filter(excludeFields = []) {
    const { sort, page, limit, fields, keyword, ...queryObj } =
      this.queryString;
    const filterObj = {};

    // Tìm kiếm theo keyword trên các searchFields
    if (keyword && this.searchFields.length > 0) {
      filterObj.$or = this.searchFields.map((f) => ({
        [f]: { $regex: keyword, $options: 'i' },
      }));
    }

    // Loại các field không cần lọc
    excludeFields.forEach((field) => {
      delete queryObj[field];
    });

    Object.entries(queryObj).forEach(([key, rawValue]) => {
      let value = rawValue;

      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value)) value = +value;

      // Thay dấu _ thành . để có thể lọc trên các trường nested trong MongoDB
      key = key.replace(/_/g, '.'); // Chuyển dấu _ thành .

      // Kiểm tra các nested field và lọc theo đúng cú pháp MongoDB
      const isNestedField = key.includes('.');
      if (isNestedField) {
        const keys = key.split('.');
        if (keys.length > 1) {
          const nestedKey = keys[keys.length - 1];
          filterObj[key] = { $regex: value, $options: 'i' }; // Sử dụng $regex cho text
        }
      } else {
        filterObj[key] = value;
      }
    });

    if (Object.keys(filterObj).length > 0) {
      this.pipeline.push({ $match: filterObj });
    }

    return this;
  }

  sort() {
    const { sort } = this.queryString;
    const sortObj = {};

    if (sort) {
      sort.split(',').forEach((field) => {
        const order = field.startsWith('-') ? -1 : 1;
        const fieldName = field.replace(/^-/, '');
        sortObj[fieldName] = order;
      });
    } else {
      sortObj._id = -1; // default sort
    }

    this.pipeline.push({ $sort: sortObj });
    return this;
  }

  limitFields() {
    const { fields } = this.queryString;
    if (fields) {
      const project = {};
      fields.split(',').forEach((field) => (project[field] = 1));
      this.pipeline.push({ $project: project });
    }
    return this;
  }

  pagination() {
    const { page, limit } = this.queryString;
    const skip = ((+page || 1) - 1) * (+limit || 100);
    const lim = +limit || 100;
    this.pipeline.push({ $skip: skip });
    this.pipeline.push({ $limit: lim });
    return this;
  }
}

module.exports = APIAggregateFeatures;
