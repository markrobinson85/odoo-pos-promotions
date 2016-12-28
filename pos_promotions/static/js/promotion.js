odoo.define('pos_promotions.promotion', function (require) {
"use strict";

var models = require('point_of_sale.models');
var screens = require('point_of_sale.screens');
var core = require('web.core');
var utils = require('web.utils');

var round_pr = utils.round_precision;
var QWeb     = core.qweb;

// make sure to load product category.
models.load_fields('product.template','categ_id');
//models.load_fields('pos.order.line',['rule_ids', 'rules_applied']);
//models.load_fields('pos.order.line','rules_applied');

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

models.load_models([
    {
        model: 'pos.promotion',
        condition: function(self){ return !!self.config.stock_location_id[0]; },
        fields: ['name', 'locations', 'label','notes','coupon_code','date_start', 'date_end', 'priority', 'discount_type', 'max_qty','discount_step','discount_amount','stop_processing','categories_applied','categories_excluded','products_applied','products_excluded'],
        domain: [['active', '=', true]],
        loaded: function(self,promotion_rules){
            var promo_rules = _.filter(promotion_rules, function(rule){
                // Make sure POS Id is within rule locations, unless rule locations is empty.
                if (_.contains(rule.locations, self.config.id) || rule.locations.length == 0){
                    //var today = new Date().toISOString().slice(0,10);
                    //var today = new Date().setHours(0,0,0,0);
                    var currentDate = new Date();
                    var day = currentDate.getDate();
                    var month = currentDate.getMonth();
                    var year = currentDate.getFullYear();
                    var today = new Date(Date.UTC(year, month, day));
                    var date_start = new Date(rule.date_start);
                    var date_end = (!rule.date_end) ? false : new Date(rule.date_end);

                    // Start date must be less than today
                    // End date must be either greater than today, or unset.
                    if (((+date_start <= +today) && (!date_end)) || (((+date_start <= +today) && (+date_end >= +today))))
                    {
                        return rule;
                    }

                }
                //return;
            });

            self.promotions = promo_rules;
        },
    }
/*    ,{
        model: 'pos.promotion',
        condition: function(self){ return !!self.loyalty; },
        fields: ['name','type','product_id','category_id','cumulative','pp_product','pp_currency'],
        domain: function(self){ return [['loyalty_program_id','=',self.loyalty.id]]; },
        loaded: function(self,rules){

            self.loyalty.rules = rules;
            self.loyalty.rules_by_product_id = {};
            self.loyalty.rules_by_category_id = {};

            for (var i = 0; i < rules.length; i++){
                var rule = rules[i];
                if (rule.type === 'product') {
                    if (!self.loyalty.rules_by_product_id[rule.product_id[0]]) {
                        self.loyalty.rules_by_product_id[rule.product_id[0]] = [rule];
                    } else if (rule.cumulative) {
                        self.loyalty.rules_by_product_id[rule.product_id[0]].unshift(rule);
                    } else {
                        self.loyalty.rules_by_product_id[rule.product_id[0]].push(rule);
                    }
                } else if (rule.type === 'category') {
                    var category = self.db.get_category_by_id(rule.category_id[0]);
                    if (!self.loyalty.rules_by_category_id[category.id]) {
                        self.loyalty.rules_by_category_id[category.id] = [rule];
                    } else if (rule.cumulative) {
                        self.loyalty.rules_by_category_id[category.id].unshift(rule);
                    } else {
                        self.loyalty.rules_by_category_id[category.id].push(rule);
                    }
                }
            }
        },
    },{
        model: 'loyalty.reward',
        condition: function(self){ return !!self.loyalty; },
        fields: ['name','type','minimum_points','gift_product_id','point_cost','discount_product_id','discount','point_value','point_product_id'],
        domain: function(self){ return [['loyalty_program_id','=',self.loyalty.id]]; },
        loaded: function(self,rewards){
            self.loyalty.rewards = rewards;
            self.loyalty.rewards_by_id = {};
            for (var i = 0; i < rewards.length;i++) {
                self.loyalty.rewards_by_id[rewards[i].id] = rewards[i];
            }
        },
    },
*/
],{'after': 'product.product'});

//var _super = models.Order;
//models.Order = models.Order.extend({

//});


    var _super_orderline = models.Orderline;
    models.Orderline = models.Orderline.extend({
        initialize: function(attr,options){
            var self = this;
            _super_orderline.prototype.initialize.apply(self,arguments)
            self.rules_applied = [];
            self.stop_processing = false;
        },
        can_be_merged_with: function(orderline){
            var self = this;

            // Returns true if BOGO applies to this line.
            if (self.bogo_merge(orderline)){
                return false;
            }

            if(_super_orderline.prototype.can_be_merged_with.apply(this,arguments))
                return true;
        },
        bogo_merge: function(orderline) {
            var merge = false;
            _.each(this.pos.promotions, function(rule){
                if (_.contains(rule.categories_applied, orderline.product.pos_categ_id[0])){
                    if (rule.discount_type == 'bogo_cheapest') {
                        merge = true;
                    }
                }
            });
            return merge;
        },
        set_quantity: function(quantity){
            self = this;

            this.order.assert_editable();
            if(quantity === 'remove'){
                this.order.remove_orderline(this);
                return;
            }

            var quant = parseFloat(quantity) || 0;
            var unit = this.get_unit();
            if ((self.bogo_merge(this)) && (quant > 1))
            {
                var i = 0
                for (i = 0; i <= quant; i++) {
                    self.order.add_product(this.product);
                }
                // Because it is bogo, we will set the origianl line to just 1 quant.
                quant = 1;
                if(unit){
                    if (unit.rounding) {
                        this.quantity    = round_pr(quant, unit.rounding);
                        var decimals = this.pos.dp['Product Unit of Measure'];
                        //this.quantityStr = formats.format_value(round_di(this.quantity, decimals), { type: 'float', digits: [69, decimals]});
                    } else {
                        this.quantity    = round_pr(quant, 1);
                        //this.quantityStr = this.quantity.toFixed(0);
                    }
                }else{
                    this.quantity    = quant;
                    this.quantityStr = '' + this.quantity;
                }
                this.trigger('change',this);
            } else {
                // Run the normal stuff.
                _super_orderline.prototype.set_quantity.apply(this,arguments)
            }
        },
    });

    screens.OrderWidget.extend({
        // Execute our sales rules each time the order is updated.
        execute_rules: function(){
            //this._super();
        }
    });

    function execute_rules(this_screen){

        var order = this_screen.pos.get_order();

        var orderlines = order.get_orderlines();

        var sorted_rules = _.sortBy(this_screen.pos.promotions, function(rule){
            return rule.priority;
        });

        _.each(sorted_rules, function(rule){
            console.log(rule);
            _.each(orderlines, function(line){
                console.log(line);
                //rule.categories_applied["0"];

                if (_.contains(rule.categories_applied, line.product.pos_categ_id[0])){
                    if (rule.discount_type == 'to_percent'){
                        line.set_discount(rule.discount_amount);
                    }
                }
                //line.product.pos_categ_id[0]; // Product Category ID
                //line.discount; // The line discount
                //line.quantity; // The qty of this orderline
                //line.price; // the price of this orderline.
            });
        });
    }

    screens.OrderWidget.include({
         orderline_add: function(){
            var self = this;
            this._super();
            self.execute_rules();
         },
         orderline_remove: function(line){
            var self = this;
            //this._super();
            self.execute_rules();
         },
         // Apply discounts and verify can do it.
         apply_discounts: function(line, rule){

            // If no rules have been applied yet, reset discount to 0.
            if (line.rules_applied.length == 0)
                line.set_discount(0);

            // If line's rules_applied already has this rule id, we stop.
            if (_.contains(line.rules_applied, rule.id))
                return;

            // Get the discount amount of previous discounts, if any.
            var discount_dollars = line.price * (1 - line.discount/100);

            // Get the compounded discount, or just discount.
            var discount_compounded = ((discount_dollars*(rule.discount_amount))/line.price);

            // Set the discount.
            line.set_discount(discount_compounded);

            // Add this rule id to the rules_applied array.
            line.rules_applied.push(rule.id);

            // If this rule says to stop processing, we add stop processing to this line.
            if (rule.stop_processing)
               line.stop_processing = true;
         },
         execute_rules: function(){
            var self = this;
            // Get orderlines
            var order = this.pos.get_order();
            var orderlines = order.get_orderlines();

            // Sort rules by priority.
            var sorted_rules = _.sortBy(this.pos.promotions, function(rule){
                return rule.priority;
            });

            _.each(orderlines, function(item){
                var itemPrice = item.price;

                // If the item is free, or negative, don't process rules,.
                if (itemPrice < 0)
                    return;



                // Play through each rule.
                _.each(sorted_rules, function(rule){
                    var order_qty = 0;
                    var rule_percent = rule.discount_amount;

                    var qty = item.get_quantity;

                    var discount_amount = 0;
                    var original_discount_amount = 0;

                    switch(rule.discount_type){
                        case 'to_percent':
                            _.each(orderlines, function(line){


                                // If stop processing true on this line, skip.
                                if (line.stop_processing)
                                    return;

                                // If orderline's product categories line up with the current rule, apply.
                                if (_.contains(rule.categories_applied, line.product.pos_categ_id[0])) {
                                    self.apply_discounts(line,rule);

                                /*  //line.set_discount(rule.discount_amount);
                                    if (line.rules_applied.length == 0)
                                        line.set_discount(0);

                                    if (_.contains(line.rules_applied, rule.id))
                                        return;

                                    //line.set_discount((rule.discount_amount / line.discount))
                                    //var discount_dollars = Math.min(Math.max(parseFloat(rule.discount_amount) || 0, 0),100);

                                    // TODO: Discounts should continue to apply, but only onto the discounted amount.
                                    var discount_dollars = line.price * (1 - line.discount/100);

                                    var discount_compounded = ((discount_dollars*(rule.discount_amount))/line.price);

                                    line.set_discount(discount_compounded);

                                    line.rules_applied.push(rule.id);
                                    if (rule.stop_processing)
                                        line.stop_processing = true;
                                 */
                                }

                            });
                            break;
                        case 'bogo_cheapest':
                            //rule.discount_step;
                            //rule.discount_amount;
                            var minPrice = 99999;
                            var step = rule.discount_step;

                            var discounted_items = [];
                            var applied_lines = [];
                            var applied_qty = 0;

                            // Iterate over each orderline.
                            _.each(orderlines, function(line){
                                if (line.stop_processing)
                                    return;

                                // If the orderline is in the applicable category, apply.
                                if (_.contains(rule.categories_applied, line.product.pos_categ_id[0])) {
                                    // Add the quantity.
                                    applied_qty += line.get_quantity();
                                    applied_lines.push(line);
                                }
                            });

                            if (applied_lines.length >= step){
                                var sorted_discounted_items = _.sortBy(applied_lines, function(item){
                                    return item.price;
                                });

                                var filter_qty = Math.floor(applied_qty / step);

                                //sorted_discounted_items.slice(0,filter_qty - 1);
                                var apply_to = _.first(sorted_discounted_items, filter_qty);

                                _.each(apply_to, function(line){
                                    self.apply_discounts(line,rule);
                                    /*
                                    line.set_discount(rule.discount_amount);
                                    line.rules_applied.push(rule.id);
                                    if (rule.stop_processing)
                                        line.stop_processing = true;
                                    */
                                });
                            }

                            //_.filter([1,2,3,4...], function(item, index) {
                            //  return (index % 2 == 0);
                            //});

                            break;
                    }

                });
            });
            _.each(orderlines, function(line){
                // Reset all lines promotion before playing through each rule.
                line.stop_processing = false;
                line.rules_applied = [];
            });
         }
    });
});