from app.main import branch_manager_operation_blocked


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
