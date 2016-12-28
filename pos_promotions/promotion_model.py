# -*- coding: utf-8 -*-
from openerp import models, fields, api
from openerp.osv import osv

class Promotion(models.Model):
    #_inherit = "account.analytic.account"
    _name = "pos.promotion"
    _description = "Promotional Rule"
    _inherit = "mail.thread"
    name = fields.Char("Promotion Name", required=True)
    notes = fields.Text()
    locations = fields.Many2many("pos.config", string="Locations", track_visibility="onchange")
    active = fields.Boolean("Active", track_visibility="onchange")
    coupon_code = fields.Char("Coupon Code", required=False, track_visibility="onchange")
    date_start = fields.Date("Start Date", default=fields.Date.today, track_visibility="onchange")
    date_end = fields.Date("End Date", track_visibility="onchange")
    priority = fields.Integer("Priority", track_visibility="onchange")
    discount_type = fields.Selection([('to_percent', 'Percentage'), ('bogo_cheapest', 'The Cheapest'), ('fixed_discount', 'Fixed Price Discount')])
    max_qty = fields.Integer("Maximum Quantity", track_visibility="onchange")
    discount_step = fields.Integer("Discount Step", track_visibility="onchange")
    discount_amount = fields.Float("Discount Amount", track_visibility="onchange")
    stop_processing = fields.Boolean("Stop processing rules after this rule.", track_visibility="onchange")
    categories_applied = fields.Many2many("pos.category", "promotion_category_applied", string="Categories Applied", track_visibility="onchange")
    categories_excluded = fields.Many2many("pos.category", "promotion_category_excluded", string="Categories Excluded", track_visibility="onchange")
    products_applied = fields.Many2many("product.template", "promotion_product_applied", string="Products Applied", track_visibility="onchange")
    products_excluded = fields.Many2many("product.template", "promotion_product_excluded", string="Products Excluded", track_visibility="onchange")
    label = fields.Char("Label (How discount appears on receipt)", track_visiblity="onchange", track_visibility="onchange")

class Discount(osv.osv):
    _name = "pos.promotion.discount"
    _description = "Discount applied to order line."
    name = fields.Char("Discount Name")
    rule = fields.Many2many('pos.promotion', string="Promotions Applied")
    discount_applied = fields.Float("Discount Amount")

class PromotionOrderLine(osv.osv):
    _inherit = 'pos.order.line'
    discount = fields.One2one("pos.promotion.discount")
    #rule_ids = fields.Char('Rules applied', default="")
    #rules_applied = fields.Many2many('pos.promotion', string="Promotions Applied")