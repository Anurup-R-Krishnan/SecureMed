from django.test import SimpleTestCase

from apps.clinical.infection_tracking.views import _parse_int_query_param


class QueryParamParserTests(SimpleTestCase):
    def test_returns_default_for_missing_value(self):
        value = _parse_int_query_param(None, default=10, field='limit', minimum=1, maximum=500)
        self.assertEqual(value, 10)

    def test_parses_valid_integer(self):
        value = _parse_int_query_param('120', default=10, field='limit', minimum=1, maximum=500)
        self.assertEqual(value, 120)

    def test_raises_for_non_integer(self):
        with self.assertRaisesMessage(ValueError, "Invalid 'limit' value; expected integer."):
            _parse_int_query_param('abc', default=10, field='limit', minimum=1, maximum=500)

    def test_raises_for_out_of_bounds(self):
        with self.assertRaisesMessage(ValueError, "Invalid 'limit' value; maximum is 500."):
            _parse_int_query_param('501', default=10, field='limit', minimum=1, maximum=500)
