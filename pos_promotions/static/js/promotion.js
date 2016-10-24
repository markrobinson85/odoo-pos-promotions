odoo.define('pos.promotion', function (require) {
"use strict";

var models = require('point_of_sale.models');
var screens = require('point_of_sale.screens');
var core = require('web.core');
var utils = require('web.utils');

var round_pr = utils.round_precision;
var QWeb     = core.qweb;

// make sure to load product category.
models.load_fields('product.template','categ_id');
models.load_fields('pos.order.line','rule_ids');


models.load_models([
    {
        model: 'pos.promotion',
        condition: function(self){ return !!self.config.stock_location_id[0]; },
        fields: ['name', 'locations', 'label','notes','coupon_code','date_start', 'date_end', 'priority', 'discount_type', 'max_qty','discount_step','discount_amount','stop_processing','categories_applied','categories_excluded','products_applied','products_excluded'],
        domain: null,
        loaded: function(self,promotion_rules){
            var promo_rules = _.filter(promotion_rules, function(rule){
                if (_.contains(rule.locations, self.config.id) || rule.locations.length == 0){
                 return rule;
                }
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
        }
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
         execute_rules: function(){
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

                var appliedRules = [];

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
                                console.log(line);
                                //rule.categories_applied["0"];
                                // If the orderline is in the applicable category, apply.
                                if (_.contains(rule.categories_applied, line.product.pos_categ_id[0])) {
                                    line.set_discount(rule.discount_amount);
                                    appliedRules.push(rule.id);
                                }
                            });
                            break;
                        case 'bogo_cheapest':
                            //rule.discount_step;
                            //rule.discount_amount;
                            var minPrice = 99999;
                            var applyItemId = null;
                            var step = rule.discount_step;

                            var discounted_items = [];
                            var applied_lines = [];
                            var applied_qty = 0;

                            // Iterate over each orderline.
                            _.each(orderlines, function(line){
                                console.log(line);

                                var price = line.price;

                                // rule.categories_applied["0"];
                                // If the orderline is in the applicable category, apply.
                                if (_.contains(rule.categories_applied, line.product.pos_categ_id[0])) {
                                    applied_lines.push(line);
                                    // Add the quantity.
                                    applied_qty += line.get_quantity();
                                    appliedRules.push(rule.id);
                                    //discounted_items.push(line);
                                    line.set_discount(0);
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
                                    line.set_discount(rule.discount_amount);
                                });
                            }

                            //_.filter([1,2,3,4...], function(item, index) {
                            //  return (index % 2 == 0);
                            //});

                            break;
                    }

                });
            });
         }
    });
});