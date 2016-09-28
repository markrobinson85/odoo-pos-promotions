import time
from openerp.osv import osv, fields
from openerp.tools.translate import _

from numpy.distutils.system_info import f2py_info
import time
from openerp.osv import osv, fields
from openerp.tools.translate import _

import time
from openerp.tools.translate import _
from openerp.tools.float_utils import float_round
import logging
_logger = logging.getLogger(__name__)

from openerp import tools
from openerp.osv import fields, osv
from openerp.tools.translate import _

import openerp.addons.decimal_precision as dp
import openerp.addons.product.product
from datetime import datetime

class sale_order_line(osv.osv):
    _inherit = 'sale.order.line'
    _columns = {
    'state': fields.selection(
        [('cancel', 'Cancelled'),('draft', 'Draft'),('confirmed', 'Confirmed'),('exception', 'Exception'),('done', 'Done')],
        'Status', readonly=True, copy=False,
        help='* The \'Draft\' status is set when the related sales order in draft status. \
            \n* The \'Confirmed\' status is set when the related sales order is confirmed. \
            \n* The \'Exception\' status is set when the related sales order is set as exception. \
            \n* The \'Done\' status is set when the sales order line has been picked. \
            \n* The \'Cancelled\' status is set when a user cancel the sales order related.'),
        'order_id': fields.many2one('sale.order', 'Order Reference', ondelete='cascade', select=True, readonly=True, states={'draft':[('readonly',False)]}),
        'delay': fields.float('Delivery Lead Time', help="Number of days between the order confirmation and the shipping of the products to the customer", readonly=True, states={'draft': [('readonly', False)]}),
    }

class pos_order(osv.osv):
    _inherit = 'pos.order'

    def get_default_warehouse(self, cr, uid, context=None):
        company_id = self.pool.get('res.users')._get_company(cr, uid, context=context)
        warehouse_ids = self.pool.get('stock.warehouse').search(cr, uid, [('company_id', '=', company_id)], context=context)
        if not warehouse_ids:
            return False
        return warehouse_ids[0]

    def get_payment_term(self, cr, uid, context=None):
        payment_term_id = self.pool.get('account.payment.term').search(cr, uid, [('name', '=', 'Layby')], context=context)
        if payment_term_id:
            return payment_term_id[0]
        return False

    def get_default_company(self, cr, uid, context=None):
        company_id = self.pool.get('res.users').browse(cr, uid, uid, context=context).company_id.id
        if not company_id:
            raise osv.except_osv(_('Error!'), _('There is no default company for the current user\'s company!'))
        return company_id

    def _layby_order_fields(self, cr, uid, ui_order, context=None):
        part = self.pool.get('res.partner').browse(cr, uid, ui_order['partner_id'], context=context)
        pricelist = part.property_product_pricelist and part.property_product_pricelist.id or False
        print 'ui_order', ui_order['lines']
        return {
            'name': self.pool.get('ir.sequence').get(cr, uid, 'layby.order'),
            'date_order': time.strftime('%Y-%m-%d'),
            'partner_id': ui_order['partner_id'],
            'partner_invoice_id': ui_order['partner_id'],
            'partner_shipping_id': ui_order['partner_id'],
            'order_line': ui_order['lines'],
            'user_id': ui_order['user_id'] or False,
            'pricelist_id': pricelist,
            'warehouse_id': self.get_default_warehouse(cr, uid, context=context),
            'company_id': self.get_default_company(cr, uid, context=context),
            'payment_term': self.get_payment_term(cr, uid, context=context),
        }

    def _sale_order_fields(self, cr, uid, ui_order, context=None):
        part = self.pool.get('res.partner').browse(cr, uid, ui_order['partner_id'], context=context)
        pricelist = part.property_product_pricelist and part.property_product_pricelist.id or False
        print 'ui_order', ui_order['lines']
        order_dic = {
            'name': self.pool.get('ir.sequence').get(cr, uid, 'sale.order'),
            'date_order': datetime.now(),
            'order_policy': 'manual',
            'partner_id': ui_order['partner_id'],
            'partner_invoice_id': ui_order['partner_id'],
            'partner_shipping_id': ui_order['partner_id'],
            'order_line': ui_order['lines'],
            'user_id': ui_order['user_id'] or False,
            'pricelist_id': pricelist,
            'warehouse_id': self.get_default_warehouse(cr, uid, context=context),
            'company_id': self.get_default_company(cr, uid, context=context),
            'payment_term': self.get_payment_term(cr, uid, context=context),
        }
        _logger.error('order_dic------- %s', order_dic)
        return order_dic

    def create_layby_from_ui(self, cr, uid, orders, context=None):
        # Keep only new orders
        submitted_references = [o['data']['name'] for o in orders]
        existing_order_ids = self.search(cr, uid, [('pos_reference', 'in', submitted_references)], context=context)
        existing_orders = self.read(cr, uid, existing_order_ids, ['pos_reference'], context=context)
        existing_references = set([o['pos_reference'] for o in existing_orders])
        orders_to_save = [o for o in orders if o['data']['name'] not in existing_references]
        layby_obj = self.pool.get('layby.order')
        invoice_obj = self.pool.get('account.invoice')
        for tmp_order in orders_to_save:
            order = tmp_order['data']
            layby_id = layby_obj.create(cr, uid, self._layby_order_fields(cr, uid, order, context=context),context)
            layby_obj.reserve_products(cr, uid, [layby_id], context=context)
            layby_obj.create_invoice(cr, uid, [layby_id], context=context)
            invoice_ids = invoice_obj.search(cr, uid, [('layby_order_id', '=', layby_id)], context=context)
            invoice_obj.signal_workflow(cr, uid, invoice_ids, 'invoice_open')
        return True

    def create_sale_order_from_ui(self, cr, uid, orders, context=None):
        # Keep only new orders
        submitted_references = [o['data']['name'] for o in orders]
        existing_order_ids = self.search(cr, uid, [('pos_reference', 'in', submitted_references)], context=context)
        existing_orders = self.read(cr, uid, existing_order_ids, ['pos_reference'], context=context)
        existing_references = set([o['pos_reference'] for o in existing_orders])
        orders_to_save = [o for o in orders if o['data']['name'] not in existing_references]
        sale_order_obj = self.pool.get('sale.order')
        invoice_obj = self.pool.get('account.invoice')
        for tmp_order in orders_to_save:
            order = tmp_order['data']
            _logger.error('order------- %s', order)
            order_id = sale_order_obj.create(cr, uid, self._sale_order_fields(cr, uid, order, context=context),context)
            sale_order_obj.signal_workflow(cr, uid, [order_id], 'order_confirm')
            sale_order_obj.action_invoice_create(cr, uid, [order_id], context=context)
            inv_ids = []
            for so in sale_order_obj.browse(cr, uid, order_id, context=context):
                inv_ids += [invoice.id for invoice in so.invoice_ids]
            invoice_obj.signal_workflow(cr, uid, inv_ids, 'invoice_open')
        return True

    def get_account_id(self, cr, uid, journal, partner_id, context=None):
        partner_pool = self.pool.get('res.partner')
        journal_pool = self.pool.get('account.journal')

        partner = partner_pool.browse(cr, uid, partner_id, context=context)
        account_id = False
        if journal.type in ('sale','sale_refund'):
            account_id = partner.property_account_receivable.id
        elif journal.type in ('purchase', 'purchase_refund','expense'):
            account_id = partner.property_account_payable.id
        else:
            if not journal.default_credit_account_id or not journal.default_debit_account_id:
                raise osv.except_osv(_('Error!'), _('Please define default credit/debit accounts on the journal "%s".') % (journal.name))
            account_id = journal.default_credit_account_id.id or journal.default_debit_account_id.id
        return account_id

    def _account_voucher_fields(self, cr, uid, payment_info, journal_id, amount, context=None):
        journal_pool = self.pool.get('account.journal')
        invoice_obj = self.pool.get('account.invoice')
        voucher_obj = self.pool.get('account.voucher')
        journal = journal_pool.browse(cr, uid, int(journal_id), context=context)
        periods = self.pool.get('account.period').find(cr, uid, context=context)
        currency_id = self.pool.get('res.users').browse(cr, uid, uid, context=context).company_id.currency_id.id
        company_id = self.get_default_company(cr, uid, context=context)
        partner_id = payment_info['partner_id'][0]
        date = time.strftime('%Y-%m-%d')
        inv = invoice_obj.browse(cr, uid, payment_info['id'], context=context)
        ttype = inv.type in ('out_invoice','out_refund') and 'receipt' or 'payment'
        vals = voucher_obj.onchange_amount(cr, uid, [], amount, 1.0, partner_id, journal.id, currency_id, ttype, date, currency_id, company_id, context=context)
        res = voucher_obj.onchange_journal(cr, uid, [], journal.id, None, None, partner_id, date, amount, ttype, company_id, context=context)
        for key in res.keys():
                vals[key].update(res[key])
        vals['value']['journal_id'] = journal_id
        return vals

    def payment_invoice_via_pos(self, cr, uid, payment_info, journal_id, amount, context=None):
        if context is None:
            ctx = {}
        voucher_obj = self.pool.get('account.voucher')
        voucher_line_obj = self.pool.get('account.voucher.line')

        inv = self.pool.get('account.invoice').browse(cr, uid, payment_info['id'], context=context)
        ctx= {
                'payment_expected_currency': inv.currency_id.id,
                'default_partner_id': self.pool.get('res.partner')._find_accounting_partner(inv.partner_id).id,
                'default_amount': amount,
                'default_reference': inv.name,
                'close_after_process': True,
                'invoice_type': inv.type,
                'invoice_id': inv.id,
                'default_type': inv.type in ('out_invoice','out_refund') and 'receipt' or 'payment',
                'type': inv.type in ('out_invoice','out_refund') and 'receipt' or 'payment'
            }
        if amount != 0:
            vals = self._account_voucher_fields(cr, uid, payment_info, journal_id, amount, context=ctx)
            del vals['value']['line_cr_ids']
            del vals['value']['line_dr_ids']

            voucher_id = voucher_obj.create(cr, uid, vals['value'], context=ctx)
            res = self._account_voucher_fields(cr, uid, payment_info, journal_id, amount, context=ctx)
            print res
            if res['value']['line_cr_ids']:
                for line in res['value']['line_cr_ids']:
                    line['voucher_id'] = voucher_id
                    voucher_line_obj.create(cr, uid, line, context=ctx)
            if res['value']['line_dr_ids']:
                for line in res['value']['line_dr_ids']:
                    line['voucher_id'] = voucher_id
                    voucher_line_obj.create(cr, uid, line, context=ctx)

            voucher_obj.signal_workflow(cr, uid, [voucher_id], 'proforma_voucher')
            return True
        else:
            return False
        
    def check_product(self, cr, uid, ids, context=None):
        prod_obj = self.pool.get('product.product')
        tmpl_obj = self.pool.get('product.template')
        prod = prod_obj.browse(cr, uid, ids[0])
        _logger.error('ids------- %s', ids)
        tmplids = tmpl_obj.search(cr, uid, [('id','=',prod.product_tmpl_id.id)])
        tmpl = tmpl_obj.browse(cr, uid, tmplids)
        if tmpl.track_outgoing and tmpl.track_incoming:
            temp = 1
            return temp
        elif tmpl.track_outgoing:
            temp = 12
            return temp
        else:
            temp = 123
            return temp
    
    def create_picking(self, cr, uid, ids, context=None):
        """Create a picking for each order and validate it."""
        picking_obj = self.pool.get('stock.picking')
        partner_obj = self.pool.get('res.partner')
        move_obj = self.pool.get('stock.move')
        lot_obj=self.pool.get('stock.production.lot')

        for order in self.browse(cr, uid, ids, context=context):
            addr = order.partner_id and partner_obj.address_get(cr, uid, [order.partner_id.id], ['delivery']) or {}
            picking_type = order.picking_type_id
            picking_id = False
            if picking_type:
                picking_id = picking_obj.create(cr, uid, {
                    'origin': order.name,
                    'partner_id': addr.get('delivery',False),
                    'date_done' : order.date_order,
                    'picking_type_id': picking_type.id,
                    'company_id': order.company_id.id,
                    'move_type': 'direct',
                    'note': order.note or "",
                    'invoice_state': 'none',
                }, context=context)
                self.write(cr, uid, [order.id], {'picking_id': picking_id}, context=context)
            location_id = order.location_id.id
            if order.partner_id:
                destination_id = order.partner_id.property_stock_customer.id
            elif picking_type:
                if not picking_type.default_location_dest_id:
                    raise osv.except_osv(_('Error!'), _('Missing source or destination location for picking type %s. Please configure those fields and try again.' % (picking_type.name,)))
                destination_id = picking_type.default_location_dest_id.id
            else:
                destination_id = partner_obj.default_get(cr, uid, ['property_stock_customer'], context=context)['property_stock_customer']

            move_list = []
            for line in order.lines:
                if line.product_id and line.product_id.type == 'service':
                    continue

                mv_list = {
                        'name': line.name,
                        'product_uom': line.product_id.uom_id.id,
                        'product_uos': line.product_id.uom_id.id,
                        'picking_id': picking_id,
                        'picking_type_id': picking_type.id, 
                        'product_id': line.product_id.id,
                        'product_uos_qty': abs(line.qty),
                        'product_uom_qty': abs(line.qty),
                        'state': 'draft',
                        'location_id': location_id if line.qty >= 0 else destination_id,
                        'location_dest_id': destination_id if line.qty >= 0 else location_id,
                    }
                if line.serial_no:
                    _logger.error('normal------- %s', line.serial_no)
                    if line.serial_no != '0':
                        lot_ids = lot_obj.search(cr, uid, [('name','=',line.serial_no),('product_id','=',line.product_id.id)])
                        _logger.error('lot_id------- %s', lot_ids)
                        if not lot_ids:
                            lot_id = lot_obj.create(cr, uid, {'name':line.serial_no,'product_id':line.product_id.id}, context=None)
                            mv_list.update({'restrict_lot_id': lot_id})
                            _logger.error('lot_id------- %s', lot_id)
                        else:
                            mv_list.update({'restrict_lot_id': lot_ids[0]})
                move_list.append(move_obj.create(cr, uid, mv_list, context=context))
            if picking_id:
                picking_obj.action_confirm(cr, uid, [picking_id], context=context)
                picking_obj.force_assign(cr, uid, [picking_id], context=context)
                picking_obj.action_done(cr, uid, [picking_id], context=context)
            elif move_list:
                move_obj.action_confirm(cr, uid, move_list, context=context)
                move_obj.force_assign(cr, uid, move_list, context=context)
                move_obj.action_done(cr, uid, move_list, context=context)
        return True
    
    def create_from_ui(self, cr, uid, orders, context={}):
        # Keep only new orders
        tes = False
        _logger.error('orders---12121---- %s', orders[0].get('data').get('lines'))
        for x in orders[0].get('data').get('lines'):
            _logger.error('tessss---- %s', type(x[2].get('serialNumber')))
            if x[2].get('serialNumber') != 0:
                tes = x[2].get('serialNumber')
#        tes  = next(x for x in orders[0].get('data').get('lines') if x[2].get('serialNumber','') != 0)
        _logger.error('tes---- %s', tes)
        if tes:
            if orders[0].get('data').get('is_partial',False):
                submitted_references = [o['data']['name'] for o in orders]
                existing_order_ids = self.search(cr, uid, [('pos_reference', 'in', submitted_references)], context=context)
                existing_orders = self.read(cr, uid, existing_order_ids, ['pos_reference'], context=context)
                existing_references = set([o['pos_reference'] for o in existing_orders])
                orders_to_save = [o for o in orders if o['data']['name'] not in existing_references]

                order_ids = []

                for tmp_order in orders_to_save:
                    to_invoice = tmp_order['to_invoice']
                    order = tmp_order['data']
                    order_id = self.create(cr, uid, self._order_fields(cr, uid, order, context=context),context)
    #                self.barcode_generator(cr, uid, self._order_fields(cr, uid, order, context=context),order_id,context)
                    for payments in order['statement_ids']:
                        self.add_payment(cr, uid, order_id, self._payment_fields(cr, uid, payments[2], context=context), context=context)

                    session = self.pool.get('pos.session').browse(cr, uid, order['pos_session_id'], context=context)
                    if session.sequence_number <= order['sequence_number']:
                        session.write({'sequence_number': order['sequence_number'] + 1})
                        session.refresh()

                    if order['amount_return'] and order['is_partial'] != True:
                        cash_journal = session.cash_journal_id
                        if not cash_journal:
                            cash_journal_ids = filter(lambda st: st.journal_id.type=='cash', session.statement_ids)
                            if not len(cash_journal_ids):
                                raise osv.except_osv( _('error!'),
                                    _("No cash statement found for this session. Unable to record returned cash."))
                            cash_journal = cash_journal_ids[0].journal_id
                        self.add_payment(cr, uid, order_id, {
                            'amount': -order['amount_return'],
                            'payment_date': time.strftime('%Y-%m-%d %H:%M:%S'),
                            'payment_name': _('return'),
                            'journal': cash_journal.id,
                        }, context=context)
                    order_ids.append(order_id)

                    try:
                        if order['is_partial'] != True:
                            self.signal_workflow(cr, uid, [order_id], 'paid')
                    except Exception as e:
                        _logger.error('Could not fully process the POS Order: %s', tools.ustr(e))

                    if to_invoice:
                        self.action_invoice(cr, uid, [order_id], context)
                        order_obj = self.browse(cr, uid, order_id, context)
                        self.pool['account.invoice'].signal_workflow(cr, uid, [order_obj.invoice_id.id], 'invoice_open')
            else:
                submitted_references = [o['data']['name'] for o in orders]
                existing_order_ids = self.search(cr, uid, [('pos_reference', 'in', submitted_references)], context=context)
                existing_orders = self.read(cr, uid, existing_order_ids, ['pos_reference'], context=context)
                existing_references = set([o['pos_reference'] for o in existing_orders])
                orders_to_save = [o for o in orders if o['data']['name'] not in existing_references]
                context['order'] = orders
                order_ids = []
                _logger.error('orders------- %s', orders)
                for tmp_order in orders_to_save:
                    to_invoice = tmp_order['to_invoice']
                    order = tmp_order['data']
                    order_id = self.create(cr, uid, self._order_fields(cr, uid, order, context=context),context)

                    for payments in order['statement_ids']:
                        self.add_payment(cr, uid, order_id, self._payment_fields(cr, uid, payments[2], context=context), context=context)

                    session = self.pool.get('pos.session').browse(cr, uid, order['pos_session_id'], context=context)
                    if session.sequence_number <= order['sequence_number']:
                        session.write({'sequence_number': order['sequence_number'] + 1})
                        session.refresh()

                    if order['amount_return']:
                        cash_journal = session.cash_journal_id
                        if not cash_journal:
                            cash_journal_ids = filter(lambda st: st.journal_id.type=='cash' and  and st.journal_id.name.lower()=='cash', session.statement_ids)
                            if not len(cash_journal_ids):
                                raise osv.except_osv( _('error!'),
                                    _("No cash statement found for this session. Unable to record returned cash."))
                            cash_journal = cash_journal_ids[0].journal_id
                        self.add_payment(cr, uid, order_id, {
                            'amount': -order['amount_return'],
                            'payment_date': time.strftime('%Y-%m-%d %H:%M:%S'),
                            'payment_name': _('return'),
                            'journal': cash_journal.id,
                        }, context=context)
                    order_ids.append(order_id)

                    try:
                        self.signal_workflow(cr, uid, [order_id], 'paid')
                    except Exception as e:
                        _logger.error('Could not fully process the POS Order: %s', tools.ustr(e))

                    if to_invoice:
                        self.action_invoice(cr, uid, [order_id], context)
                        order_obj = self.browse(cr, uid, order_id, context)
                        self.pool['account.invoice'].signal_workflow(cr, uid, [order_obj.invoice_id.id], 'invoice_open')
        else:
            order_ids = super(pos_order, self).create_from_ui(cr, uid, orders, context)
        return order_ids
    
    
class pos_order_line(osv.osv):
    _inherit = "pos.order.line"
    _columns = {
                'serial_no': fields.char('Serial No.')
    }
    def create(self, cr, uid, vals, context):
        _logger.error('lot------ %s', vals)
        if context:
            if context.get('order',False):
                lines = context['order'][0]['data']['lines']
                for li in lines:
                    if li[2]['product_id']==vals['product_id'] and li[2].get('serialNumber',False) != '0':
                        vals.update({'serial_no' : li[2].get('serialNumber',False)})
            #       tes  = next(x for x in lines if x[2]['product_id']==vals['product_id'])
                _logger.error('vals-2------ %s', vals)
        line_ids = super(pos_order_line,self).create(cr, uid, vals, context=None)
        return line_ids
    
pos_order_line()


class product_product(osv.osv):
    _inherit = "product.product"
    
    def get_quantity(self, cr ,uid , ids, field_names=None, arg=False, context =None):
	_logger.error('con---- %s', cr)
	_logger.error('con1---- %s', uid)
	_logger.error('con1---- %s', ids)
	_logger.error('con1---- %s', type(context))
	_logger.error('con1---- %s', context)
        context = context or {}
        field_names = field_names or []

        domain_products = [('product_id', 'in', ids)]
        domain_quant, domain_move_in, domain_move_out = self._get_domain_locations(cr, uid, ids, context=context)
        domain_move_in += self._get_domain_dates(cr, uid, ids, context=context) + [('state', 'not in', ('done', 'cancel', 'draft'))] + domain_products
        domain_move_out += self._get_domain_dates(cr, uid, ids, context=context) + [('state', 'not in', ('done', 'cancel', 'draft'))] + domain_products
        domain_quant += domain_products
        if context.get('lot_id') or context.get('owner_id') or context.get('package_id'):
            if context.get('lot_id'):
                domain_quant.append(('lot_id', '=', context['lot_id']))
            if context.get('owner_id'):
                domain_quant.append(('owner_id', '=', context['owner_id']))
            if context.get('package_id'):
                domain_quant.append(('package_id', '=', context['package_id']))
            moves_in = []
            moves_out = []
        else:
            moves_in = self.pool.get('stock.move').read_group(cr, uid, domain_move_in, ['product_id', 'product_qty'], ['product_id'], context=context)
            moves_out = self.pool.get('stock.move').read_group(cr, uid, domain_move_out, ['product_id', 'product_qty'], ['product_id'], context=context)

        quants = self.pool.get('stock.quant').read_group(cr, uid, domain_quant, ['product_id', 'qty'], ['product_id'], context=context)
        quants = dict(map(lambda x: (x['product_id'][0], x['qty']), quants))

        moves_in = dict(map(lambda x: (x['product_id'][0], x['product_qty']), moves_in))
        moves_out = dict(map(lambda x: (x['product_id'][0], x['product_qty']), moves_out))
        res = {}
        for product in self.browse(cr, uid, ids, context=context):
            id = product.id
            qty_available = float_round(quants.get(id, 0.0), precision_rounding=product.uom_id.rounding)
            incoming_qty = float_round(moves_in.get(id, 0.0), precision_rounding=product.uom_id.rounding)
            outgoing_qty = float_round(moves_out.get(id, 0.0), precision_rounding=product.uom_id.rounding)
            virtual_available = float_round(quants.get(id, 0.0) + moves_in.get(id, 0.0) - moves_out.get(id, 0.0), precision_rounding=product.uom_id.rounding)
            res[id] = {
                'qty_available': qty_available,
                'incoming_qty': incoming_qty,
                'outgoing_qty': outgoing_qty,
                'virtual_available': virtual_available,
            }
	_logger.error('res---- %s', res)
	_logger.error('qty---- %s', qty_available)
	_logger.error('inc---- %s', incoming_qty)
	_logger.error('out---- %s', outgoing_qty)
        return qty_available

product_product()

