#
#    OpenERP, Open Source Management Solution
#    Copyright (c) 2013-Present Acespritech Solutions Pvt. Ltd. (<http://acespritech.com>).
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
from openerp.report import report_sxw

class invoice_singleItemised(report_sxw.rml_parse):
    def __init__(self, cr, uid, name, context=None):
        super(invoice_singleItemised, self).__init__(cr, uid, name, context=context)
        self.localcontext.update({
            'payment_line': self._payment_line,
            'remaining_amount': self.get_remaining_amount,
        })

    def _payment_line(self, invoice):
        layby_list = []
        line_balance = float(invoice.amount_total)
        remaining_amount = 0.00
        for payment_line in self.pool.get('account.invoice').browse(self.cr, self.uid, invoice.id).payment_ids[::-1]:
            line_balance = line_balance - payment_line.credit

            if line_balance < 0:
                line_balance = abs(line_balance)

            if line_balance == 0.00:
                self.remaining_amount = 0.00
            else:
                self.remaining_amount = line_balance

            layby_dict = {
                'date': payment_line.date or '--',
                'name': invoice.partner_id.name or '--',
                'journal_id': payment_line.journal_id.name or '--',
                'credit': payment_line.credit or 0.00,
                'balance_line': line_balance or 0.00,
            }
            layby_list.append(layby_dict)
            remaining_amount = 0.00
        return layby_list

    def get_remaining_amount(self):
        return self.remaining_amount

report_sxw.report_sxw('report.invoice_report_pos', 'account.invoice', 'pos_modification/report/invoice_report.rml', parser=invoice_singleItemised, header="external")
