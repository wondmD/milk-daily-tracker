from datetime import date
from ethiopian_date import EthiopianDateConverter

def get_ethiopian_date_from_gregorian(g_date: date):
    """Converts a gregorian date to ethiopian date (year, month, day)."""
    return EthiopianDateConverter.to_ethiopian(g_date.year, g_date.month, g_date.day)

def get_gregorian_date_from_ethiopian(year: int, month: int, day: int):
    """Converts an ethiopian date to gregorian date."""
    return EthiopianDateConverter.to_gregorian(year, month, day)

def get_current_ethiopian_date():
    """Returns today's ethiopian date."""
    return get_ethiopian_date_from_gregorian(date.today())

def get_settlement_period(eth_year: int, eth_month: int, eth_day: int):
    """
    Returns the period of the month (1 or 2).
    Period 1 is from day 1 to 15.
    Period 2 is from day 16 to end of month.
    """
    return 1 if eth_day <= 15 else 2
