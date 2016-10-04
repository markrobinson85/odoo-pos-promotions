function openerp_pos_cashier(instance, module){ //module is instance.point_of_sale
    var module = instance.point_of_sale;
    var QWeb = instance.web.qweb;
    _t = instance.web._t;

    globalCashier = null;

    module.CashierWidget = module.PosWidget.include({
        template: 'PosWidget',

        init: function(parent, options) {
            this._super(parent);
            var  self = this;
        },

        // recuperation de l'ID du POS
        get_cur_pos_config_id: function(){
            var self = this;
            var config = self.pos.get('pos_config');
            var config_id = null;

            if(config){
                config_id = config.id;

                return config_id;
            }
            return '';
        },

        fetch: function(model, fields, domain, ctx){
            return new instance.web.Model(model).query(fields).filter(domain).context(ctx).all()
        },

        cashier_change: function(name){
            globalCashier = name;

            $('#pay-screen-cashier-name').html(name);
            console.log('cashier_change : ' + name);

            if(name != ''){
                $('.gotopay-button').removeAttr('disabled');
            } else{
                $('.gotopay-button').attr('disabled', 'disabled');
            }
        },

        get_cashiers: function(config_id){
            var self = this;
            var cashier_list = [];

            var loaded = self.fetch('pos.cashier',['cashier_name'],[['pos_config_id','=', config_id], ['active', '=','true']])
                .then(function(cashiers){
                     for(var i = 0, len = cashiers.length; i < len; i++){
                        cashier_list.push(cashiers[i].cashier_name);
                     }

                    if(cashier_list.length > 0){

                        for(var i = 0, len = cashier_list.length; i < len; i++){
                            var content = self.$('#cashier-select').html();
                            var new_option = '<option value="' + cashier_list[i] + '">' + cashier_list[i] + '</option>\n';
                            self.$('#cashier-select').html(content + new_option);
                            }

                        self.$('#AlertNoCashier').css('display', 'none');
                        self.$('#cashier-select').selectedIndex = 0;
                        globalCashier = cashier_list[0];
                        self.cashier_change(globalCashier);

                    } else{

                        // if there are no cashier
                        self.$('#AlertNoCashier').css('display', 'block');
                        self.$('.gotopay-button').attr('disabled', 'disabled');
                    }
                });
        },

        renderElement: function() {
            var self = this;
            this._super();

            self.$('#cashier-select').change(function(){
                var name = this.value;
                self.cashier_change(name);
            });
        },


        build_widgets: function() {
            var self = this;

            // --------  Screens ---------

            this.product_screen = new module.ProductScreenWidget(this,{});
            this.product_screen.appendTo($('#rightpane'));

            this.receipt_screen = new module.ReceiptScreenWidget(this, {});
            this.receipt_screen.appendTo($('#rightpane'));

            this.payment_screen = new module.PaymentScreenWidget(this, {});
            this.payment_screen.appendTo($('#rightpane'));

            this.welcome_screen = new module.WelcomeScreenWidget(this,{});
            this.welcome_screen.appendTo($('#rightpane'));

            this.client_payment_screen = new module.ClientPaymentScreenWidget(this, {});
            this.client_payment_screen.appendTo($('#rightpane'));

            this.scale_invite_screen = new module.ScaleInviteScreenWidget(this, {});
            this.scale_invite_screen.appendTo($('#rightpane'));

            this.scale_screen = new module.ScaleScreenWidget(this,{});
            this.scale_screen.appendTo($('#rightpane'));

            // --------  Popups ---------

            this.help_popup = new module.HelpPopupWidget(this, {});
            this.help_popup.appendTo($('.point-of-sale'));

            this.error_popup = new module.ErrorPopupWidget(this, {});
            this.error_popup.appendTo($('.point-of-sale'));

            this.error_product_popup = new module.ProductErrorPopupWidget(this, {});
            this.error_product_popup.appendTo($('.point-of-sale'));

            this.error_session_popup = new module.ErrorSessionPopupWidget(this, {});
            this.error_session_popup.appendTo($('.point-of-sale'));

            this.choose_receipt_popup = new module.ChooseReceiptPopupWidget(this, {});
            this.choose_receipt_popup.appendTo($('.point-of-sale'));

            this.error_negative_price_popup = new module.ErrorNegativePricePopupWidget(this, {});
            this.error_negative_price_popup.appendTo($('.point-of-sale'));

            // --------  Misc ---------

            this.notification = new module.SynchNotificationWidget(this,{});
            this.notification.appendTo(this.$('#rightheader'));

            this.username   = new module.UsernameWidget(this,{});
            this.username.replace(this.$('.placeholder-UsernameWidget'));

            this.action_bar = new module.ActionBarWidget(this);
            this.action_bar.appendTo($(".point-of-sale #rightpane"));

            this.left_action_bar = new module.ActionBarWidget(this);
            this.left_action_bar.appendTo($(".point-of-sale #leftpane"));

            this.gotopay = new module.GoToPayWidget(this, {});
            this.gotopay.replace($('#placeholder-GoToPayWidget'));

            this.paypad = new module.PaypadWidget(this, {});
            this.paypad.replace($('#placeholder-PaypadWidget'));

            this.numpad = new module.NumpadWidget(this);
            this.numpad.replace($('#placeholder-NumpadWidget'));

            this.order_widget = new module.OrderWidget(this, {});
            this.order_widget.replace($('#placeholder-OrderWidget'));

            this.onscreen_keyboard = new module.OnscreenKeyboardWidget(this, {
                'keyboard_model': 'simple'
            });
            this.onscreen_keyboard.appendTo($(".point-of-sale #content"));

            this.close_button = new module.HeaderButtonWidget(this,{
                label: _t('Close'),
                action: function(){ self.try_close(); },
            });
            this.close_button.appendTo(this.$('#rightheader'));

            this.client_button = new module.HeaderButtonWidget(this,{
                label: _t('Self-Checkout'),
                action: function(){ self.screen_selector.set_user_mode('client'); },
            });
            this.client_button.appendTo(this.$('#rightheader'));


            // --------  Screen Selector ---------

            this.screen_selector = new module.ScreenSelector({
                pos: this.pos,
                screen_set:{
                    'products': this.product_screen,
                    'payment' : this.payment_screen,
                    'client_payment' : this.client_payment_screen,
                    'scale_invite' : this.scale_invite_screen,
                    'scale':    this.scale_screen,
                    'receipt' : this.receipt_screen,
                    'welcome' : this.welcome_screen,
                },
                popup_set:{
                    'help': this.help_popup,
                    'error': this.error_popup,
                    'error-product': this.error_product_popup,
                    'error-session': this.error_session_popup,
                    'error-negative-price': this.error_negative_price_popup,
                    'choose-receipt': this.choose_receipt_popup,
                },
                default_client_screen: 'welcome',
                default_cashier_screen: 'products',
                default_mode: this.pos.iface_self_checkout ?  'client' : 'cashier',
            });

            if(this.pos.debug){
                this.debug_widget = new module.DebugWidget(this);
                this.debug_widget.appendTo(this.$('#content'));
            }
        },

    });

    module.CashierPayScreenWidget = module.PaymentScreenWidget.include({
        template: 'PaymentScreenWidget',

        show: function(){
            this._super();
            var self = this;
            this.$('#pay-screen-cashier-name').html(globalCashier);
            this.$('#ticket-screen-cashier-name').html(globalCashier);
            this.pos.get('selectedOrder').set_cashier_name(globalCashier);

            this.paypad = new module.PaypadWidget(this, {});
            this.paypad.replace($('#placeholder-PaypadWidget'));
        },

    });

    module.CashierReceiptScreenWidget = module.ReceiptScreenWidget.include({

        refresh: function() {
            this._super();
            $('.pos-receipt-container', this.$el).html(QWeb.render('PosTicket',{widget:this}));

            if(globalCashier != ''){
                this.$('#ticket-screen-cashier-name').html(globalCashier);
            }
        },

    });

    module.GoToPayWidget = module.PosBaseWidget.extend({
        template: 'GoToPayWidget',
        init: function(parent, options) {
            this._super(parent);
        },

        renderElement: function() {
            var self = this;
            this._super();

            var button = new module.GoToPayButtonWidget(self);
            button.appendTo(self.$el);
        },
    });

    module.GoToPayButtonWidget = module.PosBaseWidget.extend({
        template: 'GoToPayButtonWidget',
        init: function(parent, options) {
            this._super(parent);
        },

        renderElement: function() {
            var self = this;
            this._super();

            this.$el.click(function(){
                self.pos_widget.screen_selector.set_current_screen('payment');
            });
        },
    });


    module.Order = Backbone.Model.extend({
        initialize: function(attributes){
            Backbone.Model.prototype.initialize.apply(this, arguments);
            this.set({
                creationDate:   new Date(),
                orderLines:     new module.OrderlineCollection(),
                paymentLines:   new module.PaymentlineCollection(),
                name:           "Order " + this.generateUniqueId(),
                client:         null,
                cashier_name:   null,
            });
            this.pos =     attributes.pos;
            this.selected_orderline = undefined;
            this.screen_data = {};  // see ScreenSelector
            this.receipt_type = 'receipt';  // 'receipt' || 'invoice'
            return this;
        },
        generateUniqueId: function() {
            return new Date().getTime();
        },
        addProduct: function(product, options){
            options = options || {};
            var attr = product.toJSON();
            attr.pos = this.pos;
            attr.order = this;
            var line = new module.Orderline({}, {pos: this.pos, order: this, product: product});

            if(options.quantity !== undefined){
                line.set_quantity(options.quantity);
            }
            if(options.price !== undefined){
                line.set_unit_price(options.price);
            }

            var last_orderline = this.getLastOrderline();
            if( last_orderline && last_orderline.can_be_merged_with(line) && options.merge !== false){
                last_orderline.merge(line);
            }else{
                this.get('orderLines').add(line);
            }
            this.selectLine(this.getLastOrderline());
        },
        removeOrderline: function( line ){
            this.get('orderLines').remove(line);
            this.selectLine(this.getLastOrderline());
        },
        getLastOrderline: function(){
            return this.get('orderLines').at(this.get('orderLines').length -1);
        },
        addPaymentLine: function(cashRegister) {
            var paymentLines = this.get('paymentLines');
            var newPaymentline = new module.Paymentline({},{cashRegister:cashRegister});
            if(cashRegister.get('journal').type !== 'cash'){
                newPaymentline.set_amount( this.getDueLeft() );
            }
            paymentLines.add(newPaymentline);
        },
        getName: function() {
            return this.get('name');
        },
        getSubtotal : function(){
            return (this.get('orderLines')).reduce((function(sum, orderLine){
                return sum + orderLine.get_display_price();
            }), 0);
        },
        getTotalTaxIncluded: function() {
            return (this.get('orderLines')).reduce((function(sum, orderLine) {
                return sum + orderLine.get_price_with_tax();
            }), 0);
        },
        getDiscountTotal: function() {
            return (this.get('orderLines')).reduce((function(sum, orderLine) {
                return sum + (orderLine.get_unit_price() * (orderLine.get_discount()/100) * orderLine.get_quantity());
            }), 0);
        },
        getTotalTaxExcluded: function() {
            return (this.get('orderLines')).reduce((function(sum, orderLine) {
                return sum + orderLine.get_price_without_tax();
            }), 0);
        },
        getTax: function() {
            return (this.get('orderLines')).reduce((function(sum, orderLine) {
                return sum + orderLine.get_tax();
            }), 0);
        },
        getPaidTotal: function() {
            return (this.get('paymentLines')).reduce((function(sum, paymentLine) {
                return sum + paymentLine.get_amount();
            }), 0);
        },
        getChange: function() {
            return this.getPaidTotal() - this.getTotalTaxIncluded();
        },
        getDueLeft: function() {
            return this.getTotalTaxIncluded() - this.getPaidTotal();
        },
        set_cashier_name: function(name){
            this.set('cashier_name', name);
        },
        // sets the type of receipt 'receipt'(default) or 'invoice'
        set_receipt_type: function(type){
            this.receipt_type = type;
        },
        get_receipt_type: function(){
            return this.receipt_type;
        },
        // the client related to the current order.
        set_client: function(client){
            this.set('client',client);
        },
        get_client: function(){
            return this.get('client');
        },
        get_client_name: function(){
            var client = this.get('client');
            return client ? client.name : "";
        },
        // the order also stores the screen status, as the PoS supports
        // different active screens per order. This method is used to
        // store the screen status.
        set_screen_data: function(key,value){
            if(arguments.length === 2){
                this.screen_data[key] = value;
            }else if(arguments.length === 1){
                for(key in arguments[0]){
                    this.screen_data[key] = arguments[0][key];
                }
            }
        },
        //see set_screen_data
        get_screen_data: function(key){
            return this.screen_data[key];
        },
        // exports a JSON for receipt printing
        export_for_printing: function(){
            var orderlines = [];
            this.get('orderLines').each(function(orderline){
                orderlines.push(orderline.export_for_printing());
            });

            var paymentlines = [];
            this.get('paymentLines').each(function(paymentline){
                paymentlines.push(paymentline.export_for_printing());
            });
            var client  = this.get('client');
            var cashier = this.pos.get('cashier') || this.pos.get('user');
            var company = this.pos.get('company');
            var shop    = this.pos.get('shop');
            var date = new Date();

            return {
                orderlines: orderlines,
                paymentlines: paymentlines,
                subtotal: this.getSubtotal(),
                total_with_tax: this.getTotalTaxIncluded(),
                total_without_tax: this.getTotalTaxExcluded(),
                total_tax: this.getTax(),
                total_paid: this.getPaidTotal(),
                total_discount: this.getDiscountTotal(),
                change: this.getChange(),
                name : this.getName(),
                client: client ? client.name : null ,
                invoice_id: null,   //TODO
                cashier: cashier ? cashier.name : null,
                date: {
                    year: date.getFullYear(),
                    month: date.getMonth(),
                    date: date.getDate(),       // day of the month
                    day: date.getDay(),         // day of the week
                    hour: date.getHours(),
                    minute: date.getMinutes()
                },
                company:{
                    email: company.email,
                    website: company.website,
                    company_registry: company.company_registry,
                    contact_address: company.contact_address,
                    vat: company.vat,
                    name: company.name,
                    phone: company.phone,
                },
                shop:{
                    name: shop.name,
                },
                currency: this.pos.get('currency'),
            };
        },
        exportAsJSON: function() {
            var orderLines, paymentLines;
            orderLines = [];
            (this.get('orderLines')).each(_.bind( function(item) {
                return orderLines.push([0, 0, item.export_as_JSON()]);
            }, this));
            paymentLines = [];
            (this.get('paymentLines')).each(_.bind( function(item) {
                return paymentLines.push([0, 0, item.export_as_JSON()]);
            }, this));
            return {
                name: this.getName(),
                amount_paid: this.getPaidTotal(),
                amount_total: this.getTotalTaxIncluded(),
                amount_tax: this.getTax(),
                amount_return: this.getChange(),
                lines: orderLines,
                statement_ids: paymentLines,
                pos_session_id: this.pos.get('pos_session').id,
                partner_id: this.pos.get('client') ? this.pos.get('client').id : undefined,
                user_id: this.pos.get('cashier') ? this.pos.get('cashier').id : this.pos.get('user').id,
                cashier_name: this.pos.get('selectedOrder').get('cashier_name'),
            };
        },
        getSelectedLine: function(){
            return this.selected_orderline;
        },
        selectLine: function(line){
            if(line){
                if(line !== this.selected_orderline){
                    if(this.selected_orderline){
                        this.selected_orderline.set_selected(false);
                    }
                    this.selected_orderline = line;
                    this.selected_orderline.set_selected(true);
                }
            }else{
                this.selected_orderline = undefined;
            }
        },
    });



};

openerp.point_of_sale = function(instance) {
    instance.point_of_sale = {};

    var module = instance.point_of_sale;

    openerp_pos_db(instance,module);            // import db.js
    openerp_pos_models(instance,module);        // import pos_models.js
    openerp_pos_basewidget(instance,module);    // import pos_basewidget.js
    openerp_pos_keyboard(instance,module);      // import  pos_keyboard_widget.js
    openerp_pos_scrollbar(instance,module);     // import pos_scrollbar_widget.js
    openerp_pos_screens(instance,module);       // import pos_screens.js
    openerp_pos_widgets(instance,module);       // import pos_widgets.js
    openerp_pos_devices(instance,module);       // import pos_devices.js

    // cashiers
    openerp_pos_cashier(instance,module);       // import openerp_pos_cashier

    instance.web.client_actions.add('pos.ui', 'instance.point_of_sale.PosWidget');
};