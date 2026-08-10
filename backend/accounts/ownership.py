"""Shop-level ownership helpers.

Staff users point `business_owner` at the shop owner. All business data
is scoped to `data_owner(user)` so staff share the same ledger.
"""


def data_owner(user):
    """Return the user that owns shop data (owner, or staff's business_owner)."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return user
    owner = getattr(user, 'business_owner', None)
    return owner if owner is not None else user


def is_shop_owner(user):
    """True when user is the shop owner (not staff under another owner)."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    return getattr(user, 'business_owner_id', None) is None
