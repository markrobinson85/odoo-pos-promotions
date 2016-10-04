# -*- coding: utf-8 -*-
from openerp import models, fields, api

class Promotion(models.Model):
    #_inherit = 'account.analytic.account'
    _name = 'pos.promotion'
    _description = 'Promotional Rule'
    _inherit = 'mail.thread'
    locations = fields.One2many('stock.warehouse', 'warehouse_id', string="Locations", track_visibility='onchange')
    active = fields.Boolean('Active', track_visibility='onchange')
    coupon_code = fields.Char('Coupon Code', required=False, track_visibility='onchange')
    date_start = fields.Date('Start Date', track_visibility='onchange')
    date_end = fields.Date('End Date', track_visibility='onchange')
    priority = fields.Integer('Priority', track_visibility='onchange')
    discount_type = fields.Selection(selection=[('Percentage', 'The Cheapest', 'Fixed Price')], track_visibility='onchange')
    max_qty = fields.Integer('Maximum Quantity', track_visibility='onchange')
    discount_step = fields.Integer('Discount Step (Applies to The Cheapest: get y discount for every x amount)', track_visibility='onchange')
    discount_amount = fields.Float('Discount Amount', track_visibility='onchange')
    stop_processing = fields.Boolean('Stop processing rules after this rule.', track_visibility='onchange')
    categories_applied = fields.Many2many('pos.category', 'catagory_id_applied', string="Categories Applied", track_visibility='onchange')
    categories_excluded = fields.Many2many('pos.category', 'catagory_id_excluded', string="Categories Excluded", track_visibility='onchange')
    products_applied  = fields.Many2many('product.template', 'product_id_applied', string="Products Applied", track_visibility='onchange')
    products_excluded = fields.Many2many('product.template', 'product_id_excluded', string="Products Excluded", track_visibility='onchange')
    label = fields.Char('Label (How discount appears on receipt)', track_visiblity="onchange", track_visibility='onchange')

#user_id = fields.Many2one('res.users', 'Responsible')
#date_deadline = fields.Date('Deadline')