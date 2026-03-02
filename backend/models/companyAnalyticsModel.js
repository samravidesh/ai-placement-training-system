const pool = require('../config/db');

const createCompanyAnalytics = async ({
  companyName,
  totalHiresLast3Years,
  averagePackage,
  rolesOffered
}) => {
  const query = `
    INSERT INTO company_analytics (
      company_name,
      total_hires_last_3_years,
      average_package,
      roles_offered
    )
    VALUES ($1, $2, $3, $4)
    RETURNING id, company_name, total_hires_last_3_years, average_package, roles_offered, created_at;
  `;

  const values = [companyName, totalHiresLast3Years, averagePackage, rolesOffered];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const getAnalyticsSummary = async () => {
  const query = `
    SELECT
      id,
      company_name,
      total_hires_last_3_years,
      average_package,
      roles_offered,
      created_at
    FROM company_analytics
    ORDER BY created_at DESC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};

const getAnalyticsStatistics = async () => {
  const overviewQuery = `
    SELECT
      COUNT(*)::INT AS total_companies,
      COALESCE(SUM(total_hires_last_3_years), 0)::INT AS total_hires_last_3_years,
      COALESCE(ROUND(AVG(average_package), 2), 0)::NUMERIC AS average_package_across_companies,
      COALESCE(MAX(average_package), 0)::NUMERIC AS highest_average_package
    FROM company_analytics;
  `;

  const topCompanyQuery = `
    SELECT company_name, average_package
    FROM company_analytics
    ORDER BY average_package DESC, company_name ASC
    LIMIT 1;
  `;

  const topRolesQuery = `
    SELECT role, COUNT(*)::INT AS occurrences
    FROM (
      SELECT UNNEST(roles_offered) AS role
      FROM company_analytics
    ) role_data
    GROUP BY role
    ORDER BY occurrences DESC, role ASC
    LIMIT 5;
  `;

  const [overviewResult, topCompanyResult, topRolesResult] = await Promise.all([
    pool.query(overviewQuery),
    pool.query(topCompanyQuery),
    pool.query(topRolesQuery)
  ]);

  return {
    overview: overviewResult.rows[0],
    top_company_by_package: topCompanyResult.rows[0] || null,
    top_roles: topRolesResult.rows
  };
};

module.exports = {
  createCompanyAnalytics,
  getAnalyticsSummary,
  getAnalyticsStatistics
};