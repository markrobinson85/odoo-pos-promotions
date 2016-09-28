{
    'name': 'Promotion Rules',
    'description': 'Create promotional rules to be applied automatically by the Point of Sale. Target categories and products for discounts.',
    'author': 'Mark Robinson',
    'depends': ['point_of_sale'],
    'application': True,
    'data': [
        'user_view.xml',
        'security/ir.model.access.csv',
    ],
}