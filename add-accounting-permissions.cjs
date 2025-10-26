#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function addAccountingPermissions() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // First, check if admin.accounting permission exists
    const checkPermission = await client.query(`
      SELECT id, name FROM permissions WHERE name = 'admin.accounting'
    `);

    let accountingPermissionId;
    
    if (checkPermission.rows.length === 0) {
      // Create admin.accounting permission
      console.log('📝 Creating admin.accounting permission...');
      const createPermission = await client.query(`
        INSERT INTO permissions (name, display_name, description, resource, action) 
        VALUES ('admin.accounting', 'Access Accounting', 'Access to accounting and billing pages', 'admin', 'accounting') 
        RETURNING id
      `);
      accountingPermissionId = createPermission.rows[0].id;
      console.log(`✅ Created admin.accounting permission with ID: ${accountingPermissionId}`);
    } else {
      accountingPermissionId = checkPermission.rows[0].id;
      console.log(`✅ admin.accounting permission already exists with ID: ${accountingPermissionId}`);
    }

    // Get role IDs for standard_admin, admin, and super_admin
    const roleQuery = await client.query(`
      SELECT id, name FROM roles WHERE name IN ('standard_admin', 'admin', 'super_admin')
    `);

    console.log('\n📋 Found roles:');
    const roleMap = {};
    roleQuery.rows.forEach(role => {
      roleMap[role.name] = role.id;
      console.log(`  - ${role.name}: ID ${role.id}`);
    });

    // Assign accounting permission to roles
    const rolesToAssign = ['standard_admin', 'admin', 'super_admin'];
    
    for (const roleName of rolesToAssign) {
      if (roleMap[roleName]) {
        // Check if permission is already assigned
        const existingAssignment = await client.query(`
          SELECT * FROM role_permissions 
          WHERE role_id = $1 AND permission_id = $2
        `, [roleMap[roleName], accountingPermissionId]);

        if (existingAssignment.rows.length === 0) {
          // Assign permission to role
          await client.query(`
            INSERT INTO role_permissions (role_id, permission_id) 
            VALUES ($1, $2)
          `, [roleMap[roleName], accountingPermissionId]);
          console.log(`✅ Assigned admin.accounting permission to ${roleName}`);
        } else {
          console.log(`ℹ️  ${roleName} already has admin.accounting permission`);
        }
      } else {
        console.log(`⚠️  Role ${roleName} not found`);
      }
    }

    // Verify the assignments
    console.log('\n🔍 Verifying accounting permission assignments:');
    const verifyQuery = await client.query(`
      SELECT r.name as role_name, p.name as permission_name
      FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.name = 'admin.accounting'
      ORDER BY r.name
    `);

    if (verifyQuery.rows.length > 0) {
      verifyQuery.rows.forEach(row => {
        console.log(`  ✅ ${row.role_name} has ${row.permission_name}`);
      });
    } else {
      console.log('  ❌ No accounting permissions found after assignment');
    }

    // Check standard_admin user specifically
    console.log('\n👤 Checking user 18 (standard_admin) permissions:');
    const userPermissions = await client.query(`
      SELECT DISTINCT p.name as permission_name
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = 18 AND p.name = 'admin.accounting'
    `);

    if (userPermissions.rows.length > 0) {
      console.log('  ✅ User 18 has admin.accounting permission');
    } else {
      console.log('  ❌ User 18 does not have admin.accounting permission');
    }

    console.log('\n🎉 Accounting permissions setup complete!');

  } catch (error) {
    console.error('❌ Error adding accounting permissions:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

addAccountingPermissions();