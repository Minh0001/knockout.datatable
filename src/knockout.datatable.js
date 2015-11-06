ko.extenders.rangeValidate = function (target, options) {
    var min = options.min;
    var max = options.max;
    var message = options.message;
    //create a writeable computed observable to intercept writes to our observable
    var result = ko.computed({
        read: target,  //always return the original observables value
        write: function (newValue) {
            var current = target();
            //ask for confirmation unless you don't have
            if (newValue >= min && newValue <= max) {
                target(newValue);
            } else {
                target.notifySubscribers(current);
            }
        }
    }).extend({ notify: 'always' });

    //return the new computed observable
    return result;
};

ko.datatableModel = function () {
    var self = this;

    self.dt = {};
    self.dt.dataSourceUrl = '';
    self.dt.dataSource = ko.observable([]);
    self.dt.filter = ko.observable({});
    self.dt.sort = ko.observable({});
    self.dt.pages = ko.observable([]);
    self.dt.currentPage = ko.observable(1);//.rangeValidate({ min: 1, max: self.dt.maxPage() });
    self.dt.pageSize = ko.observable(10);
    self.dt.availablePageSize = ko.observableArray([5, 10, 20, 50, -1]);
    self.dt.maxPage = ko.observable(1);
    self.dt.total = ko.observable(0);
    self.dt.events = {};

    // methods
    self.dt.nextPage = function () {
        if (self.dt.currentPage() < Math.ceil(self.dt.total() / self.dt.pageSize())) {
            self.dt.currentPage(self.dt.currentPage() + 1);
        }
    };

    self.dt.previousPage = function () {
        if (self.dt.currentPage() > 1) {
            self.dt.currentPage(self.dt.currentPage() - 1);
        }
    };

    self.dt.toPage = function (page) {
        self.dt.currentPage(page);
    };

    self.dt.filter.subscribe(function (filter) {
        self.dt.draw();
    });

    self.dt.sort.subscribe(function (sort) {
        self.dt.draw();
    });

    function generatePages() {
        var pages = [];
        self.dt.maxPage(Math.ceil(self.dt.total() / self.dt.pageSize()));
        var start = 1;
        var end = self.dt.maxPage();
        for (var i = 1; i <= 3; i++) {
            start = self.dt.currentPage() - i > 0 ? self.dt.currentPage() - i : start;
            end = self.dt.currentPage() + i <  self.dt.maxPage() ? self.dt.currentPage() + i : end;
        }
        for (var i = start; i <= end; i++) {
            pages.push(i);
        }
        self.dt.pages(pages);
    }

    self.dt.currentPage.subscribe(function (page) {
        self.dt.draw();
        generatePages();
    });

    self.dt.pageSize.subscribe(function (pageSize) {
        self.dt.draw();
        generatePages();
    });

    self.dt.total.subscribe(function (all) {
        self.dt.draw();
        generatePages();
    });
    //
    self.dt.on = function (event, callback) {
        if (typeof (self.dt.events[event]) == 'undefined') {
            self.dt.events[event] = [];
        }
        self.dt.events[event].push(callback);
    };
    self.dt.off = function (event) {
        delete self.dt.events[event];
    };
    self.dt.BEFORE_DRAW = "beforeDraw";
    self.dt.AFTER_DRAW = "afterDraw";
    self.dt.draw = function () {
        if (typeof (self.dt.events[self.dt.BEFORE_DRAW]) != 'undefined') {
            for (var i = 0; i < self.dt.events[self.dt.BEFORE_DRAW].length; i++) {
                self.dt.events[self.dt.BEFORE_DRAW][i](self);
            }
        }
        $.ajax({
            url: self.dt.url,
            data: {
                page: self.dt.currentPage(),
                pageSize: self.dt.pageSize(),
                filters: self.dt.filter(),
                sorts: self.dt.sort()
            },
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Accept", "text/json");
            },
            method: 'POST'
        }).done(function (data) {
            self.dt.dataSource(data.dataSource);
            self.dt.total(data.total);
            if (typeof (self.dt.events[self.dt.AFTER_DRAW]) != 'undefined') {
                for (var i = 0; i < self.dt.events[self.dt.AFTER_DRAW].length; i++) {
                    self.dt.events[self.dt.AFTER_DRAW][i](self);
                }
            }
        });
    };
    self.dt.draw();
};