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
models.load_fields('pos.order.line','rule_stop');

models.load_models([
    {
        model: 'pos.promotion',
        condition: function(self){ return !!self.config.stock_location_id[0]; },
        fields: ['name', 'locations', 'label','notes','coupon_code','date_start', 'date_end', 'priority', 'discount_type', 'max_qty','discount_step','discount_amount','stop_processing','categories_applied','categories_excluded','products_applied','products_excluded'],
        domain: null,
        loaded: function(self,promotion_rules){
            var promo_rules = _.filter(promotion_rules, function(item){
                if (_.contains(item.locations, self.config.stock_location_id[0])){
                 return item;
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
        var order = this.pos.get_order();

        var orderlines = order.get_orderlines();

        var sorted_rules = _.sortBy(this.pos.promotions, function(rule){
            return rule.priority;
        });

        _.each(sorted_rules, function(rule){
            console.log(rule);
            _.each(orderlines, function(line){
                console.log(line);
                //rule.categories_applied["0"];
                if (_.contains(rule.categories_applied, line.product.pos_categ_id[0])){
                    switch(rule.discount_type){
                        case 'to_percent':
                            line.set_discount(rule.discount_amount);
                            break;

                    }
                }
            });
        });
     }
});

});

