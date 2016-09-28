openerp.pos_modification = function(instance){
    var module = instance.point_of_sale;
    var QWeb = instance.web.qweb;
	var _t = instance.web._t;
    var orderline_id = 1;
    serial_check = false;
    var round_di = instance.web.round_decimals;
    module.Orderline = module.Orderline.extend({

        initialize: function(attr,options){
            this.pos = options.pos;
            this.order = options.order;
            this.product = options.product;
            this.price   = options.product.price;
            this.quantity = 1;
            this.quantityStr = '1';
            this.discount = 0;
            this.discountStr = '0';
            this.type = 'unit';
            this.selected = false;
            this.id       = orderline_id++;
            this.product_name   = options.product.display_name;
            this.product_uom   = options.product.uom_id;
            this.serialNo = '0';
        },
        get_serial_no: function(){
            return this.serialNo;
        },
        set_serial_no: function(serial_no){
            this.serialNo = serial_no;
            this.trigger('change',this);
        },
        export_as_JSON: function() {
            return {
                serialNumber : String(this.get_serial_no()),
                qty: this.get_quantity(),
                product_uom_qty: this.get_quantity(),
                name: this.product_name,
                product_uom: this.product_uom[0],
                price_unit: this.get_unit_price(),
                discount: this.get_discount(),
                product_id: this.get_product().id,
            };
        
        },
        export_for_printing: function(){
            return {
                serialNumber:       String(this.get_serial_no()),
                quantity:           this.get_quantity(),
                unit_name:          this.get_unit().name,
                price:              this.get_unit_price(),
                discount:           this.get_discount(),
                product_name:       this.get_product().display_name,
                price_display :     this.get_display_price(),
                price_with_tax :    this.get_price_with_tax(),
                price_without_tax:  this.get_price_without_tax(),
                tax:                this.get_tax(),
                product_description:      this.get_product().description,
                product_description_sale: this.get_product().description_sale
            };
        },
    });

    module.OrderWidget = module.OrderWidget.extend({
        renderElement: function(scrollbottom){
            var self = this;
            this.pos_widget.numpad.state.reset();

            var order  = this.pos.get('selectedOrder');
            var orderlines = order.get('orderLines').models;

            var el_str  = openerp.qweb.render('OrderWidget',{widget:this, order:order, orderlines:orderlines});

            var el_node = document.createElement('div');
                el_node.innerHTML = _.str.trim(el_str);
                el_node = el_node.childNodes[0];


            var list_container = el_node.querySelector('.orderlines');
            for(var i = 0, len = orderlines.length; i < len; i++){
                var orderline = this.render_orderline(orderlines[i]);
                list_container.appendChild(orderline);
            }

            if(this.el && this.el.parentNode){
                this.el.parentNode.replaceChild(el_node,this.el);
            }
            this.el = el_node;
            this.update_summary();

            if(scrollbottom){
                this.el.querySelector('.order-scroller').scrollTop = 100 * orderlines.length;
            }
            $('.create-layby-button').on('click').click(function(){
                self.pos_widget.screen_selector.show_popup('create-layby');
             });
            $('.create-order-button').on('click').click(function(){
                self.pos_widget.screen_selector.show_popup('create-order');
             });
        },
    });

    module.CreateOrderWidget = module.PopUpWidget.extend({
        template: 'CreateOrderWidget',

        show: function () {
            var self = this;
            this._super();
            this.renderElement();
            this.$('.footer #accept').off('click').click(function () {
                self.createOrder();
            });
            this.$('.footer #cancel').off('click').click(function () {
                self.pos_widget.screen_selector.close_popup();
            });
        },
        createOrder: function(){
            var self = this;
            var currentOrder = this.pos.get('selectedOrder');
            var client = currentOrder.get_client();
            if(client) {
                this.pos.push_sale_order(currentOrder);
                this.pos.get('selectedOrder').destroy();
                alert('Create Order Success !');
                self.pos.load_new_invoices();
                self.pos_widget.screen_selector.close_popup();
            }
            else{
                alert('Please choose Customer !');
                self.pos_widget.screen_selector.close_popup();
            }
        },
        close:function(){
           this._super();
           this.pos.proxy_queue.clear();
        },
    });

    module.CreateLaybyWidget = module.PopUpWidget.extend({
        template: 'CreateLaybyWidget',

        show: function () {
            var self = this;
            this._super();
            this.renderElement();
            this.$('.footer #accept').off('click').click(function () {
                self.createLayby();
            });
            this.$('.footer #cancel').off('click').click(function () {
                self.pos_widget.screen_selector.close_popup();
            });
        },
        createLayby: function(){
            var self = this;
            var currentOrder = this.pos.get('selectedOrder');
            var client = currentOrder.get_client();
            if(client) {
                this.pos.push_layby(currentOrder);
                self.pos.get('selectedOrder').destroy();
                alert('Create Layby Success !');
                self.pos.load_new_invoices();
                self.pos_widget.screen_selector.close_popup();
            }
            else{
                alert('Please choose Customer !');
                self.pos_widget.screen_selector.close_popup();
            }

        },
        close:function(){
           this._super();
           this.pos.proxy_queue.clear();
        },

    });

    module.PosWidget = module.PosWidget.extend({
        build_widgets: function() {
            this._super();

            this.create_layby_popup = new module.CreateLaybyWidget(this, {});
            this.create_layby_popup.appendTo(this.$el);

            this.create_order_popup = new module.CreateOrderWidget(this, {});
            this.create_order_popup.appendTo(this.$el);

            this.pos_payment = new module.PosPaymentWidget(this,{});
            this.pos_payment.appendTo(this.$('.pos_order_header'));
            // --------  Screen Selector ---------
            this.laybyorder_screen = new module.LaybyOrderListScreenWidget(this, {});
            this.laybyorder_screen.appendTo(this.$('.screens'));

            this.screen_selector = new module.ScreenSelector({
                pos: this.pos,
                screen_set:{
                    'products': this.product_screen,
                    'payment' : this.payment_screen,
                    'scale':    this.scale_screen,
                    'receipt' : this.receipt_screen,
                    'clientlist': this.clientlist_screen,
                    'laybyorder_list': this.laybyorder_screen,
                },
                popup_set:{
                    'error': this.error_popup,
                    'error-barcode': this.error_barcode_popup,
                    'error-traceback': this.error_traceback_popup,
                    'confirm': this.confirm_popup,
                    'unsent-orders': this.unsent_orders_popup,
                    'create-layby': this.create_layby_popup,
                    'create-order': this.create_order_popup,
                },
                default_screen: 'products',
                default_mode: 'cashier',
            });
        },
    });

    module.PosDB = module.PosDB.extend({
        init: function(options){
            this._super(options);
            this.layby_sorted = [];
            this.layby_by_id = {};
            this.layby_name = {};
            this.layby_search_string = "";
            this.invoice_write_date = null;

            this.sale_order_sorted = [];
            this.sale_order_by_id = {};
            this.sale_order_name = {};
            this.sale_order_search_string = "";
        },
        _layby_search_string: function(layby){
            var str = '' + layby.id + ':' + layby.number;
            if(layby.origin){
                str += '|' + layby.origin;
            }
            if(layby.partner_id){
                str += '|' + layby.partner_id[1];
            }
            if(layby.date_invoice){
                str += '|' + layby.date_invoice;
            }
            return str + '\n';
        },
        add_laybys: function(laybys){
            var updated_count = 0;
            var new_write_date = '';
            for(var i = 0, len = laybys.length; i < len; i++){
                var layby = laybys[i];
                if (    this.invoice_write_date &&
                        this.partner_by_id[layby.id] &&
                        new Date(this.invoice_write_date).getTime() + 1000 >=
                        new Date(layby.write_date).getTime() ) {
                    // FIXME: The write_date is stored with milisec precision in the database
                    // but the dates we get back are only precise to the second. This means when
                    // you read partners modified strictly after time X, you get back partners that were
                    // modified X - 1 sec ago.
                    continue;
                } else if ( new_write_date < layby.write_date ) {
                    new_write_date  = layby.write_date;
                }
                if (!this.layby_by_id[layby.id]) {
                    this.layby_sorted.push(layby.id);
                }
                this.invoice_write_date = new_write_date || this.invoice_write_date;
                this.layby_by_id[layby.id] = layby;
                updated_count += 1;
            }

            if (updated_count) {
                // If there were updates, we need to completely
                // rebuild the search string and the ean13 indexing

                this.layby_search_string = "";
                this.layby_name = {};

                for (var id in this.layby_by_id) {
                    var layby = this.layby_by_id[id];

                    if(layby.name){
                        this.layby_name[layby.name] = layby;
                    }
                    this.layby_search_string += this._layby_search_string(layby);
                }
            }
            return updated_count;
        },
        remove_all_invoice: function(){
            this.layby_sorted = [];
            this.layby_by_id = {};
            this.layby_name = {};
            this.layby_search_string = "";
            this.invoice_write_date = null;
        },
        remove_all_sale_order: function(){
             this.sale_order_sorted = [];
             this.sale_order_by_id = {};
             this.sale_order_name = {};
        },
        add_sale_orders: function(sale_orders){
            var updated_count = 0;
            for(var i = 0, len = sale_orders.length; i < len; i++){
                var sale_order = sale_orders[i];


                if (!this.sale_order_by_id[sale_order.id]) {
                    this.sale_order_sorted.push(sale_order.id);
                }
                this.sale_order_by_id[sale_order.id] = sale_order;

                updated_count += 1;
            }


            if (updated_count) {
                // If there were updates, we need to completely
                // rebuild the search string and the ean13 indexing

                this.sale_order_search_string = "";
                this.sale_order_name = {};

                for (var id in this.sale_order_by_id) {
                    var sale_order = this.sale_order_by_id[id];

                    if(sale_order.name){
                        this.sale_order_name[sale_order.name] = sale_order;
                    }
                    this.sale_order_search_string += this._layby_search_string(sale_order);
                }
            }
            return updated_count;
        },
        get_layby_by_id: function(id){
            return this.layby_by_id[id];
        },
        get_layby_name: function(name){
            return this.layby_name[name];
        },
        get_invoice_write_date: function(){
            return this.invoice_write_date;
        },
        get_laybys_sorted: function(max_count){
            max_count = max_count ? Math.min(this.layby_sorted.length, max_count) : this.layby_sorted.length;
            var laybys = [];
            for (var i = 0; i < max_count; i++) {
                laybys.push(this.layby_by_id[this.layby_sorted[i]]);
            }
            return laybys.reverse();
        },
        search_layby: function(query){
            try {
                query = query.replace(/[\[\]\(\)\+\*\?\.\-\!\&\^\$\|\~\_\{\}\:\,\\\/]/g,'.');
                query = query.replace(' ','.+');
                var re = RegExp("([0-9]+):.*?"+query,"gi");
            }catch(e){
                return [];
            }
            var results = [];
            for(var i = 0; i < this.limit; i++){
                r = re.exec(this.layby_search_string);
                if(r){
                    var id = Number(r[1]);
                    results.push(this.get_layby_by_id(id));
                }else{
                    break;
                }
            }
            return results;
        },
        get_sale_order_by_id: function(id){
            return this.sale_order_by_id[id];
        },
        get_sale_order_name: function(name){
            return this.sale_order_name[name];
        },
        get_saleorders_sorted: function(max_count){
            max_count = max_count ? Math.min(this.sale_order_sorted.length, max_count) : this.sale_order_sorted.length;
            var sale_orders = [];
            for (var i = 0; i < max_count; i++) {
                sale_orders.push(this.sale_order_by_id[this.sale_order_sorted[i]]);
            }
            return sale_orders.reverse();
        },
    });

    module.Order = module.Order.extend({
       initialize: function(attributes){
           Backbone.Model.prototype.initialize.apply(this, arguments);
            this.pos = attributes.pos;
            this.sequence_number = this.pos.pos_session.sequence_number++;
            this.uid =     this.generateUniqueId();
            this.set({
                creationDate:   new Date(),
                orderLines:     new module.OrderlineCollection(),
                paymentLines:   new module.PaymentlineCollection(),
                name:           _t("Order ") + this.uid,
                client:         null,
                laybyorder : null,
            });
            this.amount_layby = 0;
            this.selected_orderline   = undefined;
            this.selected_paymentline = undefined;
            this.screen_data = {};  // see ScreenSelector
            this.receipt_type = 'receipt';  // 'receipt' || 'invoice'
            this.temporary = attributes.temporary || false;
            this.qty_left = 0;
            return this;
        },
        get_qty_left: function(){
            return this.qty_left;
        },
        set_qty_left: function(serial_qtyleft){
            this.qty_left = serial_qtyleft;
            this.trigger('change',this);
        },
       set_layby: function(layby){
            this.set('laybyorder',layby);
        },
       get_layby: function(){
            return this.get('laybyorder');
        },
        set_amount_layby: function(value){
            this.amount_layby = round_di(parseFloat(value) || 0, 2);
            this.trigger('change:amount_layby',this);
        },
        // returns the amount of money on this paymentline
        get_amount_layby: function(){
            return this.amount_layby;
        },
        addProduct: function(product, options){
            options = options || {};
            var attr = JSON.parse(JSON.stringify(product));
            attr.pos = this.pos;
            attr.order = this;
            var self = this;
            var line = new instance.point_of_sale.Orderline({}, {pos: this.pos, order: this, product: product});
            if(options.quantity !== undefined){
                line.set_quantity(options.quantity);
            }
            if(options.price !== undefined){
                line.set_unit_price(options.price);
            }
            if(options.discount !== undefined){
                line.set_discount(options.discount);
            }
            if(options.serialNo !== undefined){
                line.set_serial_no(options.serialNo);
            }
            var last_orderline = this.getLastOrderline();
            if( last_orderline && last_orderline.can_be_merged_with(line) && options.merge !== false){
	      //alert("check : "+serial_check+ " ,left : "+self.get_qty_left());
	      if (serial_check == true) {
		      if (self.get_qty_left() > 0){
			    last_orderline.merge(line);
			    this.set_qty_left(self.get_qty_left() - 1);
			}
			else{
			    var error_str = _t(' Not enough quantity ! ');
			    var error_dialog = new instance.web.Dialog(this, { 
				width: '310',
				buttons: [{text: _t("Close"), click: function() { this.parents('.modal').modal('hide'); }}],
			    }).open();
			    error_dialog.$el.append(
				'<span id="error_str" style="font-size:16px;">' + error_str + '</span>');
			    return 0;
			    
			}
		}
		else{
			last_orderline.merge(line);
		}
              //alert(Object.keys(line));
              
	      
            }else{
		var orderlines = self.get('orderLines').models;
	        for(var i = 0; i < orderlines.length; i++){
			if(orderlines[i].product.id === line.product.id){
			    //alert("lis----"+orderlines[i].quantity);			    
			    var error_str = _t(' Product already present in cart! ');
                            var error_dialog = new instance.web.Dialog(this, { 
                               width: '310',
                               buttons: [{text: _t("Close"), click: function() { this.parents('.modal').modal('hide'); }}],
                            }).open();
                            error_dialog.$el.append(
                            '<span id="error_str" style="font-size:16px;">' + error_str + '</span>');
			    return;
			    }
	        }
                new instance.web.Model("pos.order").get_func("check_product")
                            ([line.product.id], []).pipe(
                    function(res) {
                
//                new instance.web.Model("product.product").get_func("search_read")
//                            ([['track_outgoing', '=', 'True'],['id', '=', line.product.id]], []).pipe(
//                    function(res) {

                        var temp = res.toString().length;
//                        alert("res-1---"+res);
//                        alert("res-2---"+temp);
                        if (res && temp == 1) {
                            dialog = new instance.web.Dialog(this, {
                                title: _t("Serial Number"),
                                size: 'medium',
                                buttons: [
                                    {text: _t("Validate"), click: function() {
                                        var ip_number = dialog.$el.find("input#product_sr_no").val();
                                        if (ip_number.length > 0) {
                                            new instance.web.Model("stock.production.lot").get_func("search_read")
                                                        ([['name', '=', ip_number],['product_id', '=', line.product.id]], 
                                                        ['id', 'name']).pipe(
                                                function(result) {
                                                    if (result && result.length == 1) {
                                                        new instance.web.Model("product.product").get_func("get_quantity")
                                                                ([line.product.id], field_names=[], arg=false, context = {'lot_id' : result[0].id}).pipe(
                                                        function(res) {
                                                            //alert("res---3---" + res );
							    //alert("left : "+ self.get_qty_left());
                                                            if (res > 0) {
                                                                serial_no = ip_number;
                                                                self.get('orderLines').add(line);
                                                                line.set_serial_no(ip_number);
								self.set_qty_left(res - 1);
								serial_check = true;
                                                            }
                                                             else {
                                                                var error_str = _t(' Product out of stock ! '+ ip_number);
                                                                var error_dialog = new instance.web.Dialog(this, { 
                                                                    width: '310',
                                                                    buttons: [{text: _t("Close"), click: function() { this.parents('.modal').modal('hide'); }}],
                                                                }).open();
                                                                error_dialog.$el.append(
                                                                    '<span id="error_str" style="font-size:16px;">' + error_str + '</span>');
                                                                return 0;
                                                            }
                                                        });
                                                    } 
                                                    else {
                                                        var error_str = _t('No Associated Product found for serial !');
                                                        var error_dialog = new instance.web.Dialog(this, { 
                                                            width: '310',
                                                            buttons: [{text: _t("Close"), click: function() { this.parents('.modal').modal('hide'); }}],
                                                        }).open();
                                                        error_dialog.$el.append(
                                                            '<span id="error_str" style="font-size:16px;">' + error_str + '</span>');
                                                        return 0;
                                                    }
                                                }
                                            );
                                            this.parents('.modal').modal('hide');
                                        } else {
                                            var error_str =_t('Please enter correct serial number !');
                                            var error_dialog = new instance.web.Dialog(this, { 
                                                width: '310',
                                                buttons: [{text: _t("Close"), click: function() { this.parents('.modal').modal('hide'); }}],
                                            }).open();
                                            error_dialog.$el.append(
                                                '<span id="error_str" style="font-size:18px;">' + error_str + '</span>');
                                        return 0;
                                        }
                                    }},
                                    {text: _t("Cancel"), click: function() { this.parents('.modal').modal('hide'); }}
                                ]
                            }).open();
                            dialog.$el.html(QWeb.render("product-serial-number", self));
                            dialog.$el.find("input#product_sr_no").focus();
                        }
                        else if (res && temp == 2){
                            dialog1 = new instance.web.Dialog(this, {
                                title: _t("Serial Number"),
                                size: 'medium',
                                buttons: [
                                    {text: _t("Validate"), click: function() {
                                        var ip_number = dialog1.$el.find("input#product_sr_no").val();
                                        self.get('orderLines').add(line);
                                        line.set_serial_no(ip_number);
                                        self.set_qty_left(res - 1);
                                        serial_check = true;
                                        this.parents('.modal').modal('hide');
                                    }},
                                    {text: _t("Cancel"), click: function() { this.parents('.modal').modal('hide'); }}
                                ]
                            }).open();
                            dialog1.$el.html(QWeb.render("product-serial-number", self));
                            dialog1.$el.find("input#product_sr_no").focus();
                                        
                        }
                        else{
			    serial_check = false;
                            self.get('orderLines').add(line); 
                        }
                   });
            }
            this.selectLine(this.getLastOrderline());
        },
    });

    var PosModelSuper = module.PosModel
    module.PosModel = module.PosModel.extend({
        load_server_data: function(){
            var self = this;
            var loaded = PosModelSuper.prototype.load_server_data.call(this);

            loaded = loaded.then(function(){
                return self.fetch('account.invoice',['id', 'number', 'partner_id', 'date_invoice', 'amount_total', 'state', 'origin', 'residual', 'write_date'], [['state', '=', 'open']]);
            }).then(function(layby){
                self.db.add_laybys(layby);
                return $.when()
            })
            return loaded;
        },
        push_layby: function(order) {
            var self = this;

            if(order){
                this.db.add_order(order.export_as_JSON());
            }

            var pushed = new $.Deferred();

            this.flush_mutex.exec(function(){
                var flushed = self._flush_laybys(self.db.get_orders());

                flushed.always(function(ids){
                    pushed.resolve();
                });
            });
            this.db.remove_all_orders();
            return pushed;
        },
        remove_all_invoice: function(){
          this.db.remove_all_invoice();
        },
        remove_all_sale_order: function(){
          this.db.remove_all_sale_order();
        },
        push_sale_order: function(order) {
            var self = this;

            if(order){
                this.db.add_order(order.export_as_JSON());
            }

            var pushed = new $.Deferred();

            this.flush_mutex.exec(function(){
                var flushed = self._flush_sale_order(self.db.get_orders());

                flushed.always(function(ids){
                    pushed.resolve();
                });
            });
            this.db.remove_all_orders();
            return pushed;
        },
        _flush_laybys: function(orders, options) {
            var self = this;

            this.set('synch',{ state: 'connecting', pending: orders.length});

            return self._save_to_server_order(orders, options, 'create_layby_from_ui').done(function (server_ids) {
                var pending = self.db.get_orders().length;

                self.set('synch', {
                    state: pending ? 'connecting' : 'connected',
                    pending: pending
                });

                return server_ids;
            });
        },
        _flush_sale_order: function(orders, options) {
            var self = this;

            this.set('synch',{ state: 'connecting', pending: orders.length});

            return self._save_to_server_order(orders, options, 'create_sale_order_from_ui').done(function (server_ids) {
                var pending = self.db.get_orders().length;

                self.set('synch', {
                    state: pending ? 'connecting' : 'connected',
                    pending: pending
                });

                return server_ids;
            });
        },
        _save_to_server_order: function (orders, options, func) {
            if (!orders || !orders.length) {
                var result = $.Deferred();
                result.resolve([]);
                return result;
            }

            options = options || {};

            var self = this;
            var timeout = typeof options.timeout === 'number' ? options.timeout : 7500 * orders.length;

            // we try to send the order. shadow prevents a spinner if it takes too long. (unless we are sending an invoice,
            // then we want to notify the user that we are waiting on something )
            var posOrderModel = new instance.web.Model('pos.order');
            return posOrderModel.call(func,
                [_.map(orders, function (order) {
                    order.to_invoice = options.to_invoice || false;
                    return order;
                })],
                undefined,
                {
                    shadow: !options.to_invoice,
                    timeout: timeout
                }
            ).then(function (server_ids) {
                return server_ids;
            }).fail(function (error, event){
                if(error.code === 200 ){    // Business Logic Error, not a connection problem
                    self.pos_widget.screen_selector.show_popup('error-traceback',{
                        message: error.data.message,
                        comment: error.data.debug
                    });
                }
                // prevent an error popup creation by the rpc failure
                // we want the failure to be silent as we send the orders in the background
                event.preventDefault();
                console.error('Failed to send orders:', orders);
            });
        },
        load_new_invoices: function(){
            var self = this;
            var def  = new $.Deferred();
            var fields = ['id', 'number', 'partner_id', 'date_invoice', 'amount_total', 'state', 'origin', 'residual', 'write_date'];
            console.log(this.db.get_invoice_write_date());
            new instance.web.Model('account.invoice')
                .query(fields)
                .filter([['state','=','open']])
                .all({'timeout':3000, 'shadow': true})
                .then(function(invoices){
                    console.log('sale_order', invoices);
                    if (self.db.add_laybys(invoices)) {   // check if the partners we got were real updates
                        def.resolve();
                    } else {
                        def.reject();
                    }
                }, function(){ def.reject(); });
            return def;

        },
        load_sale_order: function(partner_id){
             var self = this;
            var def  = new $.Deferred();
            var fields = ['id', 'name', 'partner_id', 'date_order', 'amount_total','user_id', 'state'];
            new instance.web.Model('sale.order')
                .query(fields)
                .filter([['partner_id','=',partner_id]])
                .all({'timeout':3000, 'shadow': true})
                .then(function(sale_orders){
                    console.log('sale order', sale_orders);
                    if (self.db.add_sale_orders(sale_orders)) {   // check if the partners we got were real updates
                        def.resolve();
                    } else {
                        def.reject();
                    }
                }, function(){ def.reject(); });
            return def;
        },
    });

    module.NewHeaderButtonWidget = module.PosBaseWidget.extend({
        template: 'NewHeaderButtonWidget',
        init: function(parent, options){
            options = options || {};
            this._super(parent, options);
            this.action = options.action;
            this.label   = options.label;
        },
        renderElement: function(){
            var self = this;
            this._super();
            if(this.action){
                this.$el.click(function(){
                    self.action(); });
            }
        },
        show: function(){ this.$el.show(); },
        hide: function(){ this.$el.hide(); },
    });

    module.PosPaymentWidget = module.PosBaseWidget.extend({
        template: 'PosPaymentWidget',

        /* Overload Section */
        init: function(parent, options){
            this._super(parent,options);
            this.pos.bind('change:selectedOrder', this.refresh, this);
        },

        start: function(){
            this._super();
            this._build_widgets();
        },

        /* Custom Section */
        refresh: function(){
            this.renderElement();
            this._build_widgets();
        },

        _build_widgets: function(){
            // Create a button to open the customer popup
            var self = this;
            this.select_customer_button = new module.NewHeaderButtonWidget(this,{
                label:_t('Invoices'),
                action: function(){
                    self.pos.pos_widget.screen_selector.set_current_screen('laybyorder_list');
                },
            });
            this.select_customer_button.replace($('.SelectPaymentButton'));
            this.select_customer_button.renderElement();
            },
    });

//    Layby order list

    module.LaybyOrderListScreenWidget = module.ScreenWidget.extend({
        template: 'LaybyOrderListScreenWidget',

        init: function(parent, options){
            this._super(parent, options);
            this.cashregisters = this.pos.cashregisters;
        },

        show_leftpane: false,

        auto_back: true,

        show: function(){
            var self = this;
            this._super();

            this.renderElement();
            this.details_visible = false;
            this.old_laybyorder = this.pos.get('selectedOrder').get('laybyorder');
            this.new_laybyorder = this.old_laybyorder;

            this.$('.back').click(function(){
                self.pos_widget.screen_selector.set_current_screen('products');
            });

            this.render_list( this.pos.db.get_laybys_sorted(1000));

            this.$('.next').click(function(){
                $.when(self.pos.load_new_invoices()).done(function() {
                        self.display_client_details('hide',null,0);
                        self.render_list(self.pos.db.get_laybys_sorted(1000));
                    });
            });

            if( this.old_laybyorder ){
                this.display_client_details('show',this.old_laybyorder,0);
            }

            this.$('.layby-order-list-contents').delegate('.layby-order-line','click',function(event){
                self.line_select(event,$(this),parseInt($(this).data('id')));
            });

            var search_timeout = null;

            if(this.pos.config.iface_vkeyboard && this.pos_widget.onscreen_keyboard){
                this.pos_widget.onscreen_keyboard.connect(this.$('.searchbox input'));
            }

            this.$('.searchbox input').on('keyup',function(event){
                clearTimeout(search_timeout);

                var query = this.value;

                search_timeout = setTimeout(function(){
                    self.perform_search(query,event.which === 13);
                },70);

            });

            this.$('.searchbox .search-clear').click(function(){
                self.clear_search();
            });
            this.toggle_save_button();
        },

        perform_search: function(query, associate_result){
            if(query){
                var customers = this.pos.db.search_layby(query);
                this.display_client_details('hide');
                if ( associate_result && customers.length === 1){
                    this.new_laybyorder = customers[0];
                    this.save_changes();
                    this.pos_widget.screen_selector.back();
                }
                this.render_list(customers);
            }else{
                var customers = this.pos.db.get_laybys_sorted();
                this.render_list(customers);
            }
        },

        clear_search: function(){
            var customers = this.pos.db.get_laybys_sorted(100);
            this.render_list(customers);
            this.$('.searchbox input')[0].value = '';
            this.$('.searchbox input').focus();
        },
        update_payment_summary: function(layby, contents) {
            var currentOrder = this.pos.get('selectedOrder');
            var residual = contents.find('.layby-payment input').val();
            var paid = currentOrder.get_amount_layby();
            var remaining = paid < residual ? residual -paid : 0;
            console.log('paid, remain', paid,remaining);
            if (paid > 0){
                contents.find('.layby_paid').html(this.format_currency(paid));
                contents.find('.layby_remain').html(this.format_currency(remaining));
            }
        },

        render_list: function(laybys){
            var contents = this.$el[0].querySelector('.layby-order-list-contents');
            contents.innerHTML = "";
            for(var i = 0, len = Math.min(laybys.length,100); i < len; i++){
                var layby    = laybys[i];
                var clientline_html = QWeb.render('LaybyOrderLine',{widget: this, layby:laybys[i]});
                var clientline = document.createElement('tbody');
                clientline.innerHTML = clientline_html;
                clientline = clientline.childNodes[1];

                if( laybys === this.new_laybyorder ){
                    clientline.classList.add('highlight');
                }else{
                    clientline.classList.remove('highlight');
                }

                contents.appendChild(clientline);
            }
        },

        save_changes: function(){
            if( this.has_client_changed() ){
                this.pos.get('selectedOrder').set_layby(this.new_laybyorder);
            }
        },
        has_client_changed: function(){
            if( this.old_laybyorder && this.new_laybyorder ){
                return this.old_laybyorder.id !== this.new_laybyorder.id;
            }else{
                return !!this.old_laybyorder !== !!this.new_laybyorder;
            }
        },
        toggle_save_button: function(){
            var $button = this.$('.button.next');
            $button.text(_t('Reload'));
        },
        line_select: function(event,$line,id){
            var self = this;
            var layby = this.pos.db.get_layby_by_id(id);
            this.$('.layby-order-list .lowlight').removeClass('lowlight');
            if ( $line.hasClass('highlight') ){
                $line.removeClass('highlight');
                $line.addClass('lowlight');
                this.display_client_details('hide',layby);
                this.new_laybyorder = null;

                self.pos.get('selectedOrder').set_amount_layby(0);
            }else{
                this.$('.layby-order-list .highlight').removeClass('highlight');
                $line.addClass('highlight');
                var y = event.pageY - $line.parent().offset().top
                this.display_client_details('show',layby,y);
                this.new_laybyorder = layby;
                this.toggle_save_button();
                self.pos.get('selectedOrder').set_amount_layby(0);
            }
        },
        layby_icon_url: function(id){
            return '/web/binary/image?model=res.partner&id='+id+'&field=image_small';
        },

        // ui handle for the 'edit selected customer' action
        edit_client_details: function(layby) {
            this.display_client_details('edit',layby);
        },

        // ui handle for the 'cancel customer edit changes' action
        undo_client_details: function(layby) {
            if (!layby.id) {
                this.display_client_details('hide');
            } else {
                this.display_client_details('show',layby);
            }
        },

        display_client_details: function(visibility,layby,clickpos){
            var self = this;
            var contents = this.$('.invoice-details-contents');
            var parent   = this.$('.layby-order-list').parent();
            var scroll   = parent.scrollTop();
            var height   = contents.height();

            contents.off('click','.button.edit');
            contents.off('click','.button.save');
            contents.off('click','.button.undo');
            contents.on('click','.button.edit',function(){ self.edit_client_details(layby); });
            contents.on('click','.button.save',function(){ self.save_client_details(layby); });
            contents.on('click','.button.undo',function(){ self.undo_client_details(layby); });
            this.editing_client = false;
            this.uploaded_picture = null;
            console.log('cash', this.cashregisters);
            if(visibility === 'show'){
                contents.empty();
                contents.append($(QWeb.render('LaybyDetails',{widget:this,layby:layby})));
                contents.find('.layby-payment input').on('keyup',function(event){
                    if(this.value > layby.residual){
                        self.pos.get('selectedOrder').set_amount_layby(layby.residual);
                    }
                    else{
                        self.pos.get('selectedOrder').set_amount_layby(this.value);
                    }

                    console.log('value', this.value);
                    self.update_payment_summary(layby, contents);
                });

                contents.find('.button.payment').on('click', function(){
                    if (confirm("Are you sure you want to pay this in full?") == true) {
                            self.payment_via_pos(layby);
                            self.reload_invoice_details();
                    } else {
                        self.reload_invoice_details();
                    }
                });
                contents.find('.button.print_invoice').on('click', function(){
                    self.pos.pos_widget.do_action('pos_modification.report_invoice_pos',{additional_context:{
                        active_ids: [self.new_laybyorder.id],
                        active_id: self.new_laybyorder.id,
                    }});
                });

                var new_height   = contents.height();

                if(!this.details_visible){
                    if(clickpos < scroll + new_height + 20 ){
                        parent.scrollTop( clickpos - 20 );
                    }else{
                        parent.scrollTop(parent.scrollTop() + new_height);
                    }
                }else{
                    parent.scrollTop(parent.scrollTop() - height + new_height);
                }

                this.details_visible = true;
                this.toggle_save_button();
            }else if (visibility === 'hide') {
                contents.empty();
                if( height > scroll ){
                    contents.css({height:height+'px'});
                    contents.animate({height:0},400,function(){
                        contents.css({height:''});
                    });
                }else{
                    parent.scrollTop( parent.scrollTop() - height);
                }
                this.details_visible = false;
                this.toggle_save_button();
            }
        },

        close: function(){
            this._super();
        },

        payment_via_pos: function(layby){
            var self = this;
            var fields = {}
            this.$('.invoice-details-contents .detail').each(function(idx,el){
                fields[el.name] = el.value;
                console.log('fields', fields);
             });
            fields.cash_id = fields.cash_id;
            var amount = this.pos.get('selectedOrder').get_amount_layby();
            new instance.web.Model('pos.order').call('payment_invoice_via_pos',[layby, fields.cash_id, amount]).then(function(result){
                   if(result == true){
                       alert('Payment Success !');
                       self.pos.pos_widget.do_action('pos_modification.report_invoice_pos',{additional_context:{
                        active_ids: [self.new_laybyorder.id],
                        active_id: self.new_laybyorder.id,
                        }});
                        self.old_laybyorder = null;
                        self.new_laybyorder = null;
                       self.reload_invoice_details();
                   }
            });
        },

        reload_invoices: function(){
            var self = this;
            this.pos.remove_all_invoice();
            return this.pos.load_new_invoices().done(function(){
                console.log('reload list invoice');
                self.render_list(self.pos.db.get_laybys_sorted(1000));
            });
        },
        reload_invoice_details: function(){
            var self = this;
            this.reload_invoices().then(function(){
                self.display_client_details('hide',null,0);
            });
        },
    });

    module.ClientListScreenWidget = module.ClientListScreenWidget.extend({
        render_so_list: function(sale_orders){
            var contents = this.$el[0].querySelector('.sale-order-list-contents');
            contents.innerHTML = "";
            for(var i = 0, len = Math.min(sale_orders.length,100); i < len; i++){
            var clientline_html = QWeb.render('SaleOrderLine',{widget: this, sale_order: sale_orders[i]});
            var clientline = document.createElement('tbody');
            clientline.innerHTML = clientline_html;
            clientline = clientline.childNodes[1];

            contents.appendChild(clientline);
            }


        },
        display_client_details: function(visibility,partner,clickpos){
            var self = this;
            var contents = this.$('.client-details-contents');
            var parent   = this.$('.client-list').parent();
            var scroll   = parent.scrollTop();
            var height   = contents.height();

            contents.off('click','.button.edit');
            contents.off('click','.button.save');
            contents.off('click','.button.undo');
            contents.on('click','.button.edit',function(){ self.edit_client_details(partner); });
            contents.on('click','.button.save',function(){ self.save_client_details(partner); });
            contents.on('click','.button.undo',function(){ self.undo_client_details(partner); });
            this.editing_client = false;
            this.uploaded_picture = null;

            if(visibility === 'show'){
                contents.empty();
                contents.append($(QWeb.render('ClientDetails',{widget:this,partner:partner})));
                this.pos.remove_all_sale_order();
                var contents_so = this.$('.sale-order-list-contents');
                contents_so.empty();
                $.when(self.pos.load_sale_order(partner.id)).done(function() {
                    self.render_so_list(self.pos.db.get_saleorders_sorted(1000));
                });
                var new_height   = contents.height();
                if(!this.details_visible){
                    if(clickpos < scroll + new_height + 20 ){
                        parent.scrollTop( clickpos - 20 );
                    }else{
                        parent.scrollTop(parent.scrollTop() + new_height);
                    }
                }else{
                    parent.scrollTop(parent.scrollTop() - height + new_height);
                }

                this.details_visible = true;
                this.toggle_save_button();

            } else if (visibility === 'edit') {
                this.editing_client = true;
                contents.empty();
                contents.append($(QWeb.render('ClientDetailsEdit',{widget:this,partner:partner})));
                this.toggle_save_button();

                contents.find('.image-uploader').on('change',function(){
                    self.load_image_file(event.target.files[0],function(res){
                        if (res) {
                            contents.find('.client-picture img, .client-picture .fa').remove();
                            contents.find('.client-picture').append("<img src='"+res+"'>");
                            contents.find('.detail.picture').remove();
                            self.uploaded_picture = res;
                        }
                    });
                });
            } else if (visibility === 'hide') {
                contents.empty();
                if( height > scroll ){
                    contents.css({height:height+'px'});
                    contents.animate({height:0},400,function(){
                        contents.css({height:''});
                    });
                }else{
                    parent.scrollTop( parent.scrollTop() - height);
                }
                this.details_visible = false;
                this.toggle_save_button();
            }
        },
    });
}

