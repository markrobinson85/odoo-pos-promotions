# -*- coding: utf-8 -*-
from openerp import models, fields, api

class Promotion(models.Model):
    #_inherit = 'account.analytic.account'
    _name = 'pos.promotion'
    _description = 'Promotional Rule'
    _inherit = 'mail.thread'
    locations = fields.One2many('stock.warehouse', 'warehouse_id', string="Locations")
    status = fields.Boolean('Status', track_visibility='onchange')
    coupon_code = fields.Char('Coupon Code', required=False, track_visibility='onchange')
    date_start = fields.Date('Start Date')
    date_end = fields.Date('End Date')
    priority = fields.Integer('Priority')
    discount_type = fields.Selection(selection=[('Percentage', 'The Cheapest', 'Fixed Price')])
    max_qty = fields.Integer('Maximum Quantity')
    discount_step = fields.Integer('Discount Step (Buy x)')
    discount_amount = fields.Float('Discount Amount')
    stop_processing = fields.Boolean('Stop processing rules after this rule.')
    categories_applied = fields.One2many('pos.category', 'catagory_id_applied', string="Categories Applied")
    categories_excluded = fields.One2many('pos.category', 'catagory_id_excluded', string="Categories Excluded")
    products_applied  = fields.One2many('product.template', 'product_id_applied', string="Products Applied")
    products_excluded = fields.One2many('product.template', 'product_id_excluded', string="Products Excluded")
    label = fields.Char('Label (How discount appears on receipt)', track_visiblity="onchange")

#user_id = fields.Many2one('res.users', 'Responsible')
#date_deadline = fields.Date('Deadline')