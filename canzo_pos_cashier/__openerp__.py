# -*- coding: utf-8 -*-
{
    'name': 'POS Sales Persons',
    'version': '1.0.0',
    'category': 'Point Of Sale',
    'sequence': 3,
    'author': 'Thierry Godin',
    'summary': 'Switch out sales person instead of user account during sale',
    'description': """
Manage multiple sales persons during a sale
======================================
Instead of choosing the user and needing multiple users, use one user for the Point of Sale, and allow swapping in and out of sales persons as needed.
    """,
    'depends': ["point_of_sale"],
    'data': [
        'security/pos_cashier_security.xml',
        'security/ir.model.access.csv',
        'cashier_view.xml',
        'order_cashier_view.xml',
    ],
    'js': [
        'static/src/js/pos_cashier.js',
    ],
    'css': [
        'static/src/css/pos_cashier.css',
    ],
    'qweb': [
        'static/src/xml/pos_cashier.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}