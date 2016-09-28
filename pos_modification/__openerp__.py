# -*- coding: utf-8 -*-
##############################################################################
#
#    OpenERP, Open Source Management Solution
#    Copyright (C) 2004-2010 Tiny SPRL (<http://tiny.be>).
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################


{
    'name': 'POS Modification',
    'version': '1.0',
    'category': 'Point of Sale',
    'sequence': 6,
    'summary': ' Create order on POS ',
    'description': """

=======================

This module adds features to the Point of Sale:
- Create Layby Order
- Create Order

""",
    'author': 'Teckzilla',
    'depends': [ 'sale','purchase'],
    'data': ['view/purchase_view.xml','pos_modification.xml','point_of_sale_report.xml'],
    'qweb':[
        'static/src/xml/pos_modification.xml',
    ],
    'installable': True,
    'auto_install': False,
}

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
