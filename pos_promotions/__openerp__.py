{
    'name': 'POS Promotional Discounts Rules',
    'description': 'Create promotional rules to be applied automatically by the Point of Sale. Target categories and products for discounts.',
    'author': 'Mark Robinson',
    'depends': ['point_of_sale'],
    'application': True,
    'data': [
        'promotion_view.xml',
        'security/ir.model.access.csv',
        'data.xml'
    ],
    'js': [
        'static/js/promotion.js',
    ],
}