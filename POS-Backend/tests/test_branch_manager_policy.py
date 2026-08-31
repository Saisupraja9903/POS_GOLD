from app.main import branch_manager_operation_blocked, supervisory_operation_blocked


def test_counter_mutations_are_blocked():
    assert branch_manager_operation_blocked("POST", "pos/cart/items")
    assert branch_manager_operation_blocked("POST", "pos/cart/checkout")
    assert branch_manager_operation_blocked("PATCH", "pos/cart/products/wastage")
    assert branch_manager_operation_blocked("DELETE", "pos/cart/items/line-id")
    assert branch_manager_operation_blocked("POST", "customers")
    assert branch_manager_operation_blocked("POST", "pos/returns")
    assert branch_manager_operation_blocked("POST", "pos/returns/preview")


def test_monitoring_and_auth_routes_remain_available():
    assert not branch_manager_operation_blocked("GET", "pos/invoices")
    assert not branch_manager_operation_blocked("GET", "pos/products")
    assert not branch_manager_operation_blocked("GET", "dashboard/summary")
    assert not branch_manager_operation_blocked("POST", "auth/pos/login")


def test_gold_exchange_policy_is_explicit_per_manager_role():
    assert supervisory_operation_blocked("SALES_MANAGER", "POST", "pos/exchanges")
    assert supervisory_operation_blocked("SALES_MANAGER", "POST", "pos/exchanges/exchange-id/payments")
    assert supervisory_operation_blocked("BRANCH_MANAGER", "POST", "pos/exchanges")
    assert supervisory_operation_blocked("BRANCH_MANAGER", "POST", "pos/exchanges/exchange-id/refund")


def test_old_gold_mutations_remain_blocked_for_both_managers():
    for role in ("SALES_MANAGER", "BRANCH_MANAGER"):
        assert supervisory_operation_blocked(role, "POST", "pos/old-gold-buybacks/valuation")
        assert supervisory_operation_blocked(role, "POST", "pos/old-gold-buybacks/buyback-id/payment")


def test_salesperson_counter_operations_are_untouched():
    assert not supervisory_operation_blocked("SALES_PERSON", "POST", "pos/cart/checkout")
    assert not supervisory_operation_blocked("SALES_PERSON", "POST", "pos/old-gold-buybacks")
    assert not supervisory_operation_blocked("SALES_PERSON", "POST", "pos/exchanges")
