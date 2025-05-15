/**
 * So sánh hai đối tượng và trả về một đối tượng chứa các thay đổi
 * @param {Object} oldObj - Đối tượng cũ
 * @param {Object} newObj - Đối tượng mới
 * @returns {Object} - Đối tượng chứa các thay đổi
 */
exports.compareChanges = (oldObj, newObj) => {
  const changes = {};

  // Danh sách các trường cần theo dõi thay đổi
  const fieldsToTrack = [
    'ten',
    'trangThai',
    'deTaiCap',
    'trangThaiDuyet',
    'tinhCapThiet',
    'mucTieu',
    'noiDungChinh',
    'linhVuc',
  ];

  // Kiểm tra các trường đơn giản
  fieldsToTrack.forEach((field) => {
    // Xử lý đặc biệt cho trường linhVuc là đối tượng
    if (field === 'linhVuc') {
      // Nếu cả hai đều có linhVuc
      if (oldObj[field] && newObj[field]) {
        const oldId = oldObj[field]._id || oldObj[field].id;
        const newId = newObj[field]._id || newObj[field].id;

        // So sánh dựa trên _id thay vì toàn bộ đối tượng
        if (!oldId || !newId || oldId.toString() !== newId.toString()) {
          changes[field] = {
            old: oldObj[field],
            new: newObj[field],
          };
        }
      }
      // Nếu một trong hai không có linhVuc
      else if (oldObj[field] !== newObj[field]) {
        changes[field] = {
          old: oldObj[field],
          new: newObj[field],
        };
      }
    }
    // Xử lý các trường còn lại
    else if (oldObj[field] !== newObj[field]) {
      changes[field] = {
        old: oldObj[field],
        new: newObj[field],
      };
    }
  });

  // Kiểm tra thay đổi trong danh sách sinh viên
  if (oldObj.sinhVien && newObj.sinhVien) {
    const oldSinhVien = [...oldObj.sinhVien];
    const newSinhVien = [...newObj.sinhVien];

    // Ánh xạ sinh viên theo ID để dễ so sánh
    const oldSvMap = new Map();
    const newSvMap = new Map();

    oldSinhVien.reduce((map, sv) => {
      const svId = sv.sinhVienId._id || sv.sinhVienId;
      map.set(svId.toString(), sv);
      return map;
    }, oldSvMap);

    newSinhVien.reduce((map, sv) => {
      const svId = sv.sinhVienId._id || sv.sinhVienId;
      map.set(svId.toString(), sv);
      return map;
    }, newSvMap);

    // Tìm sinh viên đã thêm mới
    const addedSv = [];
    newSvMap.forEach((sv, id) => {
      if (!oldSvMap.has(id)) {
        addedSv.push(sv);
      }
    });

    // Tìm sinh viên đã xóa
    const removedSv = [];
    oldSvMap.forEach((sv, id) => {
      if (!newSvMap.has(id)) {
        removedSv.push(sv);
      }
    });

    // Tìm sinh viên đã thay đổi vai trò
    const modifiedSv = [];
    oldSvMap.forEach((oldSv, id) => {
      const newSv = newSvMap.get(id);
      if (newSv && oldSv.vaiTro !== newSv.vaiTro) {
        modifiedSv.push({
          sinhVien: oldSv.sinhVienId,
          oldRole: oldSv.vaiTro,
          newRole: newSv.vaiTro,
        });
      }
    });

    if (addedSv.length > 0 || removedSv.length > 0 || modifiedSv.length > 0) {
      changes.sinhVien = {
        added: addedSv,
        removed: removedSv,
        modified: modifiedSv,
      };
    }
  }

  // Kiểm tra thay đổi trong danh sách giảng viên
  if (oldObj.giangVien && newObj.giangVien) {
    const oldGV = [...oldObj.giangVien];
    const newGV = [...newObj.giangVien];

    // Ánh xạ giảng viên theo ID để dễ so sánh
    const oldGvMap = new Map();
    const newGvMap = new Map();

    oldGV.reduce((map, gv) => {
      const gvId = gv.giangVienId._id || gv.giangVienId;
      map.set(gvId.toString(), gv);
      return map;
    }, oldGvMap);

    newGV.reduce((map, gv) => {
      const gvId = gv.giangVienId._id || gv.giangVienId;
      map.set(gvId.toString(), gv);
      return map;
    }, newGvMap);

    // Tìm giảng viên đã thêm mới
    const addedGv = [];
    newGvMap.forEach((gv, id) => {
      if (!oldGvMap.has(id)) {
        addedGv.push(gv);
      }
    });

    // Tìm giảng viên đã xóa
    const removedGv = [];
    oldGvMap.forEach((gv, id) => {
      if (!newGvMap.has(id)) {
        removedGv.push(gv);
      }
    });

    // Tìm giảng viên đã thay đổi vai trò
    const modifiedGv = [];
    oldGvMap.forEach((oldGv, id) => {
      const newGv = newGvMap.get(id);
      if (newGv && oldGv.vaiTro !== newGv.vaiTro) {
        modifiedGv.push({
          giangVien: oldGv.giangVienId,
          oldRole: oldGv.vaiTro,
          newRole: newGv.vaiTro,
        });
      }
    });

    if (addedGv.length > 0 || removedGv.length > 0 || modifiedGv.length > 0) {
      changes.giangVien = {
        added: addedGv,
        removed: removedGv,
        modified: modifiedGv,
      };
    }
  }

  // Kiểm tra thay đổi trong danh sách giảng viên mong muốn
  if (oldObj.giangVienMongMuon && newObj.giangVienMongMuon) {
    const oldGV = [...oldObj.giangVienMongMuon];
    const newGV = [...newObj.giangVienMongMuon];

    // So sánh số lượng giảng viên mong muốn
    if (oldGV.length !== newGV.length) {
      changes.giangVienMongMuon = {
        old: oldGV,
        new: newGV,
      };
    } else {
      // Kiểm tra chi tiết nếu số lượng bằng nhau
      const hasChanges = oldGV.some((oldItem, index) => {
        const oldId =
          oldItem.giangVienMongMuonId._id || oldItem.giangVienMongMuonId;
        const newId =
          newGV[index].giangVienMongMuonId._id ||
          newGV[index].giangVienMongMuonId;

        return (
          oldId.toString() !== newId.toString() ||
          oldItem.vaiTro !== newGV[index].vaiTro
        );
      });

      if (hasChanges) {
        changes.giangVienMongMuon = {
          old: oldGV,
          new: newGV,
        };
      }
    }
  }

  return changes;
};

/**
 * Định dạng thay đổi để hiển thị dễ đọc hơn
 * @param {Object} changes - Đối tượng chứa các thay đổi
 * @returns {Array} - Mảng các thay đổi đã định dạng
 */
exports.formatChanges = (changes) => {
  const formatted = [];

  // Xử lý các trường đơn giản
  const simpleFields = {
    ten: 'Tên đề tài',
    trangThai: 'Trạng thái',
    deTaiCap: 'Cấp đề tài',
    trangThaiDuyet: 'Trạng thái duyệt',
    tinhCapThiet: 'Tính cấp thiết',
    mucTieu: 'Mục tiêu',
    noiDungChinh: 'Nội dung chính',
    linhVuc: 'Lĩnh vực',
  };

  for (const [field, label] of Object.entries(simpleFields)) {
    if (changes[field]) {
      formatted.push({
        field: label,
        oldValue: changes[field].old || 'Không có',
        newValue: changes[field].new || 'Không có',
      });
    }
  }

  // Xử lý thay đổi sinh viên
  if (changes.sinhVien) {
    if (changes.sinhVien.added && changes.sinhVien.added.length > 0) {
      formatted.push({
        field: 'Sinh viên',
        change: 'Thêm mới',
        details: changes.sinhVien.added.map((sv) => {
          const name = sv.sinhVienId.ten || 'Không rõ tên';
          return `${name} (${sv.vaiTro})`;
        }),
      });
    }

    if (changes.sinhVien.removed && changes.sinhVien.removed.length > 0) {
      formatted.push({
        field: 'Sinh viên',
        change: 'Xóa',
        details: changes.sinhVien.removed.map((sv) => {
          const name = sv.sinhVienId.ten || 'Không rõ tên';
          return `${name} (${sv.vaiTro})`;
        }),
      });
    }

    if (changes.sinhVien.modified && changes.sinhVien.modified.length > 0) {
      formatted.push({
        field: 'Sinh viên',
        change: 'Thay đổi vai trò',
        details: changes.sinhVien.modified.map((mod) => {
          const name = mod.sinhVien.ten || 'Không rõ tên';
          return `${name}: ${mod.oldRole} -> ${mod.newRole}`;
        }),
      });
    }
  }

  // Xử lý thay đổi giảng viên
  if (changes.giangVien) {
    if (changes.giangVien.added && changes.giangVien.added.length > 0) {
      formatted.push({
        field: 'Giảng viên',
        change: 'Thêm mới',
        details: changes.giangVien.added.map((gv) => {
          const name = gv.giangVienId.ten || 'Không rõ tên';
          return `${name} (${gv.vaiTro})`;
        }),
      });
    }

    if (changes.giangVien.removed && changes.giangVien.removed.length > 0) {
      formatted.push({
        field: 'Giảng viên',
        change: 'Xóa',
        details: changes.giangVien.removed.map((gv) => {
          const name = gv.giangVienId.ten || 'Không rõ tên';
          return `${name} (${gv.vaiTro})`;
        }),
      });
    }

    if (changes.giangVien.modified && changes.giangVien.modified.length > 0) {
      formatted.push({
        field: 'Giảng viên',
        change: 'Thay đổi vai trò',
        details: changes.giangVien.modified.map((mod) => {
          const name = mod.giangVien.ten || 'Không rõ tên';
          return `${name}: ${mod.oldRole} -> ${mod.newRole}`;
        }),
      });
    }
  }

  // Xử lý thay đổi giảng viên mong muốn
  if (changes.giangVienMongMuon) {
    formatted.push({
      field: 'Giảng viên mong muốn',
      change: 'Thay đổi',
      details: 'Danh sách giảng viên mong muốn đã được thay đổi',
    });
  }

  return formatted;
};
