import { describe, expect, it } from 'vitest';
import { navigation } from './components/PosLayout';
import { hasPermission, hasRole, homeFor, POS_ROLES, roleOf } from './roleAccess';
import type { PosUser } from './types';

function user(role: string, permissions: string[]): PosUser {
  return { full_name: role, email: `${role}@example.test`, business_name: 'Test', branch_name: 'Branch', role: { code: role, name: role }, permissions };
}
function visible(current: PosUser) { return navigation.filter(item => hasRole(current, item.roles) && hasPermission(current, item.permission)).map(item => item.label); }

describe('P1 manager role flow', () => {
  it('keeps Sales Person home and counter navigation unchanged', () => {
    const current = user(POS_ROLES.salesPerson, ['billing.view','products.view','invoices.view','exchange.view','old_gold.view','returns.view','reports.view','settings.view']);
    expect(roleOf(current)).toBe(POS_ROLES.salesPerson);
    expect(homeFor(current)).toBe('/billing');
    expect(visible(current)).toEqual(['Billing','Products','Invoices','Gold Exchange','Old Gold Buyback','Returns','Reports','Settings']);
  });

  it('makes Sales Manager supervisory while retaining intentional Gold Exchange', () => {
    const current = user(POS_ROLES.salesManager, ['billing.view','products.view','invoices.view','exchange.view','old_gold.view','returns.view','staff.view','reports.view','settings.view']);
    expect(homeFor(current)).toBe('/team');
    expect(visible(current)).toEqual(['Products','Invoices','Gold Exchange','Old Gold Buyback','Returns','Team','Reports','Return Reports','Settings']);
    expect(visible(current)).not.toContain('Billing');
  });

  it('shows Branch Manager return reports and excludes Gold Exchange', () => {
    const current = user(POS_ROLES.branchManager, ['products.view','invoices.view','old_gold.view','returns.view','staff.view','reports.view','settings.view']);
    expect(homeFor(current)).toBe('/reports');
    expect(visible(current)).toEqual(['Products','Invoices','Old Gold Buyback','Returns','Team','Reports','Return Reports','Settings']);
    expect(visible(current)).not.toContain('Billing');
    expect(visible(current)).not.toContain('Gold Exchange');
  });
});
