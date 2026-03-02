const {
  createCompanyAnalytics,
  getAnalyticsSummary,
  getAnalyticsStatistics
} = require('../models/companyAnalyticsModel');

const parseRolesOffered = (rolesOffered) => {
  if (Array.isArray(rolesOffered)) {
    return rolesOffered.map((role) => String(role).trim()).filter(Boolean);
  }

  if (typeof rolesOffered === 'string') {
    return rolesOffered
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);
  }

  return [];
};

const addCompanyAnalytics = async (req, res) => {
  try {
    const {
      company_name,
      total_hires_last_3_years,
      average_package,
      roles_offered
    } = req.body;

    if (!company_name || total_hires_last_3_years === undefined || average_package === undefined || roles_offered === undefined) {
      return res.status(400).json({
        message: 'company_name, total_hires_last_3_years, average_package, and roles_offered are required'
      });
    }

    const totalHires = Number(total_hires_last_3_years);
    const averagePackage = Number(average_package);
    const roles = parseRolesOffered(roles_offered);

    if (!Number.isInteger(totalHires) || totalHires < 0) {
      return res.status(400).json({
        message: 'total_hires_last_3_years must be a non-negative integer'
      });
    }

    if (!Number.isFinite(averagePackage) || averagePackage < 0) {
      return res.status(400).json({
        message: 'average_package must be a non-negative number'
      });
    }

    if (roles.length === 0) {
      return res.status(400).json({
        message: 'roles_offered must contain at least one role'
      });
    }

    const companyData = await createCompanyAnalytics({
      companyName: company_name,
      totalHiresLast3Years: totalHires,
      averagePackage,
      rolesOffered: roles
    });

    return res.status(201).json({
      message: 'Company analytics data added successfully',
      data: companyData
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add company analytics data', error: error.message });
  }
};

const getCompanyAnalyticsSummary = async (_req, res) => {
  try {
    const records = await getAnalyticsSummary();

    return res.status(200).json({
      count: records.length,
      companies: records
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch analytics summary', error: error.message });
  }
};

const getCompanyAnalyticsStatistics = async (_req, res) => {
  try {
    const statistics = await getAnalyticsStatistics();

    return res.status(200).json({ statistics });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch analytics statistics', error: error.message });
  }
};

module.exports = {
  addCompanyAnalytics,
  getCompanyAnalyticsSummary,
  getCompanyAnalyticsStatistics
};