import unittest
from appraisal_review.api.xml_extractor import extract_fields_from_xml

class TestGridAddressesSeparation(unittest.TestCase):
    def test_sales_and_rental_addresses_separation(self):
        res = extract_fields_from_xml('2922 Jarboe St (1).xml', extract_images=False)
        self.assertIn('sales_grid_addresses', res)
        self.assertIn('rental_grid_addresses', res)
        self.assertIn('clean_data', res)
        self.assertIn('sales_grid_addresses', res['clean_data'])
        self.assertIn('rental_grid_addresses', res['clean_data'])
        
        s_addrs = res['sales_grid_addresses']
        self.assertEqual(s_addrs['Subject'], '2922 Jarboe St, Kansas City, MO 64108')
        self.assertEqual(s_addrs['Comparable Sale 1'], '2910 Jarboe St, Kansas City, MO 64108')
        self.assertEqual(s_addrs['Comparable Sale 2'], '2636 Madison Ave, Kansas City, MO 64108')
        self.assertEqual(s_addrs['Comparable Sale 3'], '937 W 32nd Ter, Kansas City, MO 64111')
        self.assertEqual(s_addrs['Comparable Sale 4'], '2028 Bristow St, Kansas City, KS 66103')
        self.assertEqual(s_addrs['Comparable Sale 5'], '2847 Madison Ave, Kansas City, MO 64108')
        self.assertEqual(s_addrs['Comparable Sale 6'], '3416 Genessee St, Kansas City, MO 64111')
        self.assertEqual(s_addrs['Comparable Sale 7'], '2920 Belleview Ave, Kansas City, MO 64108')
        
        # Verify rental_grid_addresses does NOT contain sales comps
        r_addrs = res['rental_grid_addresses']
        for k in r_addrs:
            self.assertNotIn('Comparable Sale', k)
            self.assertNotIn('2910 Jarboe', str(r_addrs[k]))
            self.assertNotIn('2028 Bristow', str(r_addrs[k]))

if __name__ == '__main__':
    unittest.main()

