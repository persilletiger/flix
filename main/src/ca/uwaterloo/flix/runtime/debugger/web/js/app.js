/**
 * The URL to the REST API server.
 */
var URL = "http://" + window.location.hostname + ":" + window.location.port;

/**
 * A collection of common functionality.
 */
var Common = {};

/**
 * Triggers an AJAX request to the given URL.
 */
Common.ajax = function (url, failure, success) {
    $.ajax({method: "GET", dataType: 'json', url: url, success: success, error: failure});
};

/**
 * Main Application.
 */
var App = React.createClass({displayName: "App",

    /**
     * An array of currently registered refreshable components.
     */
    refreshable: [],

    /**
     * The initial state of the application consists of:
     *
     * - A page object with the name of the page (and optionally the relation/lattice).
     * - A status string representing the status of the debugger/solver.
     * - An array of relation names (used in the menu and on the landing page).
     * - An array of lattices names (used in the menu and on the landing page).
     */
    getInitialState: function () {
        return {
            page: {name: "default"},
            status: "running",
            relations: [],
            lattices: []
        };
    },

    /**
     * Retrieve the list of relations and lattices when the component is mounted.
     */
    componentDidMount: function () {
        document.title = "Flix (" + window.location.host + ")";
        this.refresh();
    },

    /**
     * Refreshes the relations and lattices.
     */
    refresh: function () {
        // retrieve relations
        Common.ajax(URL + '/relations', this.notifyConnectionError, data => {
            this.setState({relations: data})
        });

        // retrieve lattices
        Common.ajax(URL + '/lattices', this.notifyConnectionError, data => {
            this.setState({lattices: data})
        });

        // retrieve status
        Common.ajax(URL + '/status', this.notifyConnectionError, data => {
            this.setState({status: data.status})
        });
    },

    /**
     * Triggers a page change.
     */
    changePage: function (page) {
        this.setState({page: page});
    },

    /**
     * Triggers a page refresh.
     */
    refreshPage: function () {
        // refresh this component
        this.refresh();

        // loop through each refreshable component and call it.
        this.refreshable.forEach(f => f())
    },

    /**
     * Registers a refreshable component.
     */
    registerRefreshCallback: function (fn) {
        this.refreshable.push(fn);
    },

    /**
     * Un-registers a refreshable component.
     */
    unregisterRefreshCallback: function (fn) {
        this.refreshable = this.refreshable.filter(x => x != fn);
    },

    /**
     * Notifies the application component that an AJAX communication has occurred.
     */
    notifyConnectionError: function () {
        // update the status to indicate that an error has occurred.
        this.setState({status: "connectionError"});
    },

    /**
     * Renders the application.
     */
    render: function () {
        // the name of the page.
        var pageName = this.state.page.name;

        // the page component to render (defaults to the landing page).
        var page = React.createElement(LandingPage, {relations: this.state.relations, 
                                lattices: this.state.lattices, 
                                changePage: this.changePage, 
                                registerRefreshCallback: this.registerRefreshCallback, 
                                unregisterRefreshCallback: this.unregisterRefreshCallback, 
                                notifyConnectionError: this.notifyConnectionError});

        // select the page component based on the page name.
        if (pageName === "relation") {
            page = React.createElement(RelationPage, {key: this.state.page.relation, 
                                 name: this.state.page.relation, 
                                 registerRefreshCallback: this.registerRefreshCallback, 
                                 unregisterRefreshCallback: this.unregisterRefreshCallback, 
                                 notifyConnectionError: this.notifyConnectionError});
        }
        if (pageName === "lattice") {
            page = React.createElement(LatticePage, {key: this.state.page.lattice, 
                                name: this.state.page.lattice, 
                                registerRefreshCallback: this.registerRefreshCallback, 
                                unregisterRefreshCallback: this.unregisterRefreshCallback, 
                                notifyConnectionError: this.notifyConnectionError});
        }
        if (pageName === "performance/rules") {
            page = React.createElement(RulesPage, {registerRefreshCallback: this.registerRefreshCallback, 
                              unregisterRefreshCallback: this.unregisterRefreshCallback, 
                              notifyConnectionError: this.notifyConnectionError});
        }
        if (pageName === "performance/predicates") {
            page = React.createElement(PredicatesPage, {registerRefreshCallback: this.registerRefreshCallback, 
                                   unregisterRefreshCallback: this.unregisterRefreshCallback, 
                                   notifyConnectionError: this.notifyConnectionError});
        }
        if (pageName === "performance/index/hits") {
            page = React.createElement(IndexHitsPage, {registerRefreshCallback: this.registerRefreshCallback, 
                                  unregisterRefreshCallback: this.unregisterRefreshCallback, 
                                  notifyConnectionError: this.notifyConnectionError});
        }
        if (pageName === "performance/index/misses") {
            page = React.createElement(IndexMissesPage, {registerRefreshCallback: this.registerRefreshCallback, 
                                    unregisterRefreshCallback: this.unregisterRefreshCallback, 
                                    notifyConnectionError: this.notifyConnectionError});
        }
        if (pageName === "compiler/phases") {
            page = React.createElement(PhasesPage, {registerRefreshCallback: this.registerRefreshCallback, 
                               unregisterRefreshCallback: this.unregisterRefreshCallback, 
                               notifyConnectionError: this.notifyConnectionError});
        }

        return (
            React.createElement("div", null, 
                React.createElement(Menu, {changePage: this.changePage, 
                      refreshPage: this.refreshPage, 
                      status: this.state.status, 
                      relations: this.state.relations, 
                      lattices: this.state.lattices}), 
                page
            )
        );
    }
});

/**
 * Menu component.
 */
var Menu = React.createClass({displayName: "Menu",
    propTypes: {
        changePage: React.PropTypes.func.isRequired,
        refreshPage: React.PropTypes.func.isRequired,
        relations: React.PropTypes.array.isRequired,
        lattices: React.PropTypes.array.isRequired,
        status: React.PropTypes.string.isRequired
    },

    /**
     * Renders the menu component.
     */
    render: function () {
        return (
            React.createElement("nav", {className: "navbar navbar-default"}, 
                React.createElement("div", {className: "container-fluid"}, 
                    React.createElement("div", {className: "navbar-header"}, 
                        React.createElement("a", {className: "navbar-brand", href: "#", onClick: () => this.props.changePage({name: "default"})}, 
                            "Flix Debugger"
                        )
                    ), 

                    React.createElement("ul", {className: "nav navbar-nav"}, 
                        React.createElement("li", {className: "dropdown"}, 
                            React.createElement("a", {href: "#", className: "dropdown-toggle", "data-toggle": "dropdown"}, 
                                "Minimal Model ", React.createElement("span", {className: "caret"})
                            ), 
                            React.createElement("ul", {className: "dropdown-menu"}, 
                                this.props.relations.map(relation => {
                                    var name = relation.name;
                                    return React.createElement("li", {key: name, 
                                               onClick: () => this.props.changePage({name: "relation", relation: name})}, 
                                        React.createElement("a", {href: "#"}, name)
                                    )
                                }), 

                                React.createElement("li", {role: "separator", className: "divider"}), 

                                this.props.lattices.map(lattice => {
                                    var name = lattice.name;
                                    return React.createElement("li", {key: name, 
                                               onClick: () => this.props.changePage({name: "lattice", lattice: name})}, 
                                        React.createElement("a", {href: "#"}, name)
                                    )
                                })
                            )
                        )
                    ), 

                    React.createElement("ul", {className: "nav navbar-nav"}, 
                        React.createElement("li", {className: "dropdown"}, 
                            React.createElement("a", {href: "#", className: "dropdown-toggle", "data-toggle": "dropdown"}, 
                                "Performance", 
                                React.createElement("className", {className: "caret"})
                            ), 
                            React.createElement("ul", {className: "dropdown-menu"}, 
                                React.createElement("li", {onClick: () => this.props.changePage({name: "performance/rules"})}, 
                                    React.createElement("a", {href: "#"}, "Rules")
                                ), 
                                React.createElement("li", {onClick: () => this.props.changePage({name: "performance/predicates"})}, 
                                    React.createElement("a", {href: "#"}, "Predicates")
                                ), 
                                React.createElement("li", {onClick: () => this.props.changePage({name: "performance/index/hits"})}, 
                                    React.createElement("a", {href: "#"}, "Index Hits")
                                ), 
                                React.createElement("li", {onClick: () => this.props.changePage({name: "performance/index/misses"})}, 
                                    React.createElement("a", {href: "#"}, "Index Misses")
                                )
                            )
                        )
                    ), 

                    React.createElement("ul", {className: "nav navbar-nav"}, 
                        React.createElement("li", {className: "dropdown"}, 
                            React.createElement("a", {href: "#", className: "dropdown-toggle", "data-toggle": "dropdown"}, 
                                "Compiler", 
                                React.createElement("className", {className: "caret"})
                            ), 
                            React.createElement("ul", {className: "dropdown-menu"}, 
                                React.createElement("li", {onClick: () => this.props.changePage({name: "compiler/phases"})}, 
                                    React.createElement("a", {href: "#"}, " Phases ")
                                )
                            )
                        )
                    ), 

                    React.createElement("ul", {className: "nav navbar-nav navbar-right"}, 
                        React.createElement("li", {onClick: this.props.refreshPage}, 
                            React.createElement("a", {href: "#"}, 
                                React.createElement("span", {className: "glyphicon glyphicon-refresh"}), " Refresh"
                            )
                        ), 

                        React.createElement(StatusLine, {status: this.props.status})
                    )
                )
            )
        );
    }
});

/**
 * The status line component.
 */
var StatusLine = React.createClass({displayName: "StatusLine",
    propTypes: {
        status: React.PropTypes.string.isRequired
    },

    /**
     * Renders the status line.
     */
    render: function () {
        var status = this.props.status;

        var text = null;
        var icon = null;
        var className = null;

        switch (status) {
            case "running":
                text = "Running";
                icon = "glyphicon glyphicon-time";
                className = "bg-info";
                break;
            case "complete":
                text = "Complete";
                icon = "glyphicon glyphicon-ok-circle";
                className = "bg-success";
                break;
            default:
                text = "No Connection";
                icon = "glyphicon glyphicon-question-sign";
                className = "bg-danger"
        }

        return (
            React.createElement("li", {className: className}, 
                React.createElement("a", {href: "#"}, 
                    React.createElement("span", {className: icon}), " ", React.createElement("strong", null, text)
                )
            ))
    }
});


/**
 * The landing page component.
 */
var LandingPage = React.createClass({displayName: "LandingPage",
    propTypes: {
        relations: React.PropTypes.array.isRequired,
        lattices: React.PropTypes.array.isRequired,
        changePage: React.PropTypes.func.isRequired,
        registerRefreshCallback: React.PropTypes.func.isRequired,
        unregisterRefreshCallback: React.PropTypes.func.isRequired,
        notifyConnectionError: React.PropTypes.func.isRequired
    },

    /**
     * The state of this component consists of an array of data samples.
     */
    getInitialState: function () {
        return {telemetry: []};
    },

    /**
     * Refresh the AJAX data on mount. Register the component as refreshable.
     */
    componentDidMount: function () {
        this.refresh();
        this.props.registerRefreshCallback(this.refresh);
    },

    /**
     * Un-register the component as refreshable.
     */
    componentWillUnmount: function () {
        this.props.unregisterRefreshCallback(this.refresh);
    },

    /**
     * Retrieves JSON data from the server.
     */
    refresh: function () {
        Common.ajax(URL + '/telemetry/', this.notifyConnectionError, data => {
            this.setState({telemetry: data});
        });
    },

    /**
     * Renders the landing page.
     */
    render: function () {
        if (this.state.telemetry.length == 0) {
            return React.createElement("div", null, "Loading ...")
        }

        var labels = this.state.telemetry.map(s => Math.round(s.time / 1000));
        var readTasks = this.state.telemetry.map(s => s.readTasks);
        var writeTasks = this.state.telemetry.map(s => s.writeTasks);
        var facts = this.state.telemetry.map(s => s.facts);
        var memory = this.state.telemetry.map(s => s.memory);

        var last = this.state.telemetry[this.state.telemetry.length - 1];
        var currentReadTasks = numeral(last.readTasks).format('0,0');
        var currentWriteTasks = numeral(last.writeTasks).format('0,0');
        var currentFacts = numeral(last.facts).format('0,0');
        var currentMemoryUsage = numeral(last.memory).format('0,0');

        return (
            React.createElement("div", null, 
                React.createElement("div", {className: "page-header"}, 
                    React.createElement("h1", null, "Welcome to the Flix Debugger")
                ), 

                React.createElement("div", {className: "row"}, 

                    React.createElement("div", {className: "col-xs-6"}, 
                        React.createElement("h3", null, "Read Tasks (", currentReadTasks, ")"), 
                        React.createElement(LineChart, {key: Math.random(), width: 600, height: 250, labels: labels, data: readTasks, 
                                   theme: "green"}), 

                        React.createElement("h3", null, "Write Tasks (", currentWriteTasks, ")"), 
                        React.createElement(LineChart, {key: Math.random(), width: 600, height: 250, labels: labels, data: writeTasks, 
                                   theme: "orangered"}), 

                        React.createElement("h3", null, "Database (", currentFacts, " facts)"), 
                        React.createElement(LineChart, {key: Math.random(), width: 600, height: 250, labels: labels, data: facts, 
                                   theme: "magenta"}), 

                        React.createElement("h3", null, "Memory Usage (", currentMemoryUsage, " MB)"), 
                        React.createElement(LineChart, {key: Math.random(), width: 600, height: 250, labels: labels, data: memory, 
                                   theme: "blue"})
                    ), 

                    React.createElement("div", {className: "col-xs-6"}, 
                        React.createElement("h3", null, "Relations"), 

                        React.createElement("div", {className: "list-group"}, 
                            this.props.relations.map(relation => {
                                return (
                                    React.createElement("a", {href: "#", className: "list-group-item", 
                                       onClick: () => this.props.changePage({name: "relation", relation: relation.name})}, 
                                        relation.name, 
                                        React.createElement("span", {className: "badge"}, numeral(relation.size).format('0,0'))
                                    )
                                );
                            })
                        ), 

                        React.createElement("h3", null, "Lattices"), 

                        React.createElement("div", {className: "list-group"}, 
                            this.props.lattices.map(lattice => {
                                return (
                                    React.createElement("a", {href: "#", className: "list-group-item", 
                                       onClick: () => this.props.changePage({name: "lattice", lattice: lattice.name})}, 
                                        lattice.name, 
                                        React.createElement("span", {className: "badge"}, numeral(lattice.size).format('0,0'))
                                    )
                                );
                            })
                        )
                    )
                )
            )
        );
    }
});

/**
 * Relation page.
 */
var RelationPage = React.createClass({displayName: "RelationPage",
    propTypes: {
        name: React.PropTypes.string.isRequired,
        registerRefreshCallback: React.PropTypes.func.isRequired,
        unregisterRefreshCallback: React.PropTypes.func.isRequired,
        notifyConnectionError: React.PropTypes.func.isRequired
    },

    /**
     * The state is an object which holds an array of columns (strings) and rows (arrays of strings).
     */
    getInitialState: function () {
        return {table: {cols: [], rows: []}};
    },

    /**
     * Refresh the AJAX data on mount. Register the component as refreshable.
     */
    componentDidMount: function () {
        this.refresh();
        this.props.registerRefreshCallback(this.refresh);
    },

    /**
     * Un-register the component as refreshable.
     */
    componentWillUnmount: function () {
        this.props.unregisterRefreshCallback(this.refresh);
    },

    /**
     * Retrieves JSON data from the server.
     */
    refresh: function () {
        Common.ajax(URL + '/relation/' + this.props.name, this.notifyConnectionError, data => {
            this.setState({table: data})
        });
    },

    /**
     * Renders this component.
     */
    render: function () {
        var numberOfFacts = numeral(this.state.table.rows.length).format('0,0');

        return (
            React.createElement("div", null, 
                React.createElement("div", {className: "page-header"}, 
                    React.createElement("h1", null, "Relation / " + this.props.name, " (", numberOfFacts, ")")
                ), 

                React.createElement(Table, {table: this.state.table})
            )
        );
    }
});


/**
 * Lattice page.
 */
var LatticePage = React.createClass({displayName: "LatticePage",
    propTypes: {
        name: React.PropTypes.string.isRequired,
        registerRefreshCallback: React.PropTypes.func.isRequired,
        unregisterRefreshCallback: React.PropTypes.func.isRequired,
        notifyConnectionError: React.PropTypes.func.isRequired
    },

    /**
     * The state is an object which holds an array of columns (strings) and rows (arrays of strings).
     */
    getInitialState: function () {
        return {table: {cols: [], rows: []}};
    },

    /**
     * Refresh the AJAX data on mount. Register the component as refreshable.
     */
    componentDidMount: function () {
        this.refresh();
        this.props.registerRefreshCallback(this.refresh);
    },

    /**
     * Un-register the component as refreshable.
     */
    componentWillUnmount: function () {
        this.props.unregisterRefreshCallback(this.refresh);
    },

    /**
     * Retrieves JSON data from the server.
     */
    refresh: function () {
        Common.ajax(URL + '/lattice/' + this.props.name, this.notifyConnectionError, data => {
            this.setState({table: data})
        });
    },

    /**
     * Renders the component.
     */
    render: function () {
        var numberOfFacts = numeral(this.state.table.rows.length).format('0,0');

        return (
            React.createElement("div", null, 
                React.createElement("div", {className: "page-header"}, 
                    React.createElement("h1", null, "Lattice / " + this.props.name, " (", numberOfFacts, ")")
                ), 

                React.createElement(Table, {table: this.state.table})
            )
        );
    }
});

/**
 * Rules page.
 */
var RulesPage = React.createClass({displayName: "RulesPage",
    propTypes: {
        registerRefreshCallback: React.PropTypes.func.isRequired,
        unregisterRefreshCallback: React.PropTypes.func.isRequired,
        notifyConnectionError: React.PropTypes.func.isRequired
    },

    /**
     * The state is an array of rules where a rule is a {location, rule, hits, time}-object.
     */
    getInitialState: function () {
        return {rules: []};
    },

    /**
     * Refresh the AJAX data on mount. Register the component as refreshable.
     */
    componentDidMount: function () {
        this.refresh();
        this.props.registerRefreshCallback(this.refresh);
    },

    /**
     * Un-register the component as refreshable.
     */
    componentWillUnmount: function () {
        this.props.unregisterRefreshCallback(this.refresh);
    },

    /**
     * Retrieves JSON data from the server.
     */
    refresh: function () {
        Common.ajax(URL + '/performance/rules', this.notifyConnectionError, data => {
            this.setState({rules: data})
        });
    },

    /**
     * Renders the component.
     */
    render: function () {
        var table = {
            cols: ["Location", "Rule", "Hits", "Total Time (msec)", "Latency (msec/op)", "Throughput (ops/msec)"],
            rows: this.state.rules.map(row => {
                    var location = row.loc;
                    var rule = row.rule;
                    var hits = numeral(row.hits).format('0,0');
                    var time = numeral(row.time).format('0,0') + " msec";
                    var latency = numeral(row.time / row.hits).format('0.0000') + " msec/op";
                    var throughput = numeral(row.hits / row.time).format('0,0') + " ops/msec";
                    return [location, rule, hits, time, latency, throughput];
                }
            ),
            align: ["left", "left", "right", "right", "right"]
        };

        return (
            React.createElement("div", null, 
                React.createElement("div", {className: "page-header"}, 
                    React.createElement("h1", null, "Performance / Rules")
                ), 

                React.createElement("div", {className: "panel panel-default"}, 
                    React.createElement("div", {className: "panel-body"}, 
                        "The table shows the number of miliseconds spent in evaluation of each rule."
                    )
                ), 

                React.createElement(Table, {table: table})
            )
        );
    }
});

/**
 * Predicates page.
 */
var PredicatesPage = React.createClass({displayName: "PredicatesPage",
    propTypes: {
        registerRefreshCallback: React.PropTypes.func.isRequired,
        unregisterRefreshCallback: React.PropTypes.func.isRequired,
        notifyConnectionError: React.PropTypes.func.isRequired
    },

    /**
     * The state is an array of predicates where a predicate is a
     * {name, size, indexedLookups, indexedScans, fullScans} object.
     */
    getInitialState: function () {
        return {predicates: []};
    },

    /**
     * Refresh the AJAX data on mount. Register the component as refreshable.
     */
    componentDidMount: function () {
        this.refresh();
        this.props.registerRefreshCallback(this.refresh);
    },

    /**
     * Un-register the component as refreshable.
     */
    componentWillUnmount: function () {
        this.props.unregisterRefreshCallback(this.refresh);
    },

    /**
     * Retrieves JSON data from the server.
     */
    refresh: function () {
        Common.ajax(URL + '/performance/predicates', this.notifyConnectionError, data => {
            this.setState({predicates: data})
        });
    },

    /**
     * Renders the component.
     */
    render: function () {
        var table = {
            cols: ["Name", "Size", "Indexed Lookups", "Indexed Scans", "Full Scans"],
            align: ["left", "right", "right", "right", "right"],
            rows: this.state.predicates.map(row => [
                    row["name"],
                    numeral(row.size).format('0,0'),
                    numeral(row.indexedLookups).format('0,0'),
                    numeral(row.indexedScans).format('0,0'),
                    numeral(row.fullScans).format('0,0')
                ]
            )
        };

        return (
            React.createElement("div", null, 
                React.createElement("div", {className: "page-header"}, 
                    React.createElement("h1", null, "Performance / Predicates")
                ), 

                React.createElement("div", {className: "panel panel-default"}, 
                    React.createElement("div", {className: "panel-body"}, 
                        "The table shows the number of miliseconds spent in evaluation of each predicate."
                    )
                ), 

                React.createElement(Table, {table: table})
            )
        );
    }
});

/**
 * Indexes page.
 */
var IndexHitsPage = React.createClass({displayName: "IndexHitsPage",
    propTypes: {
        registerRefreshCallback: React.PropTypes.func.isRequired,
        unregisterRefreshCallback: React.PropTypes.func.isRequired,
        notifyConnectionError: React.PropTypes.func.isRequired
    },

    /**
     * The state is an array of indexes where an index is a {name, index, hits} object.
     * @returns {{indexes: Array}}
     */
    getInitialState: function () {
        return {indexes: []};
    },

    /**
     * Refresh the AJAX data on mount. Register the component as refreshable.
     */
    componentDidMount: function () {
        this.refresh();
        this.props.registerRefreshCallback(this.refresh);
    },

    /**
     * Un-register the component as refreshable.
     */
    componentWillUnmount: function () {
        this.props.unregisterRefreshCallback(this.refresh);
    },

    /**
     * Retrieves JSON data from the server.
     */
    refresh: function () {
        Common.ajax(URL + '/performance/index/hits', this.notifyConnectionError, data => {
            this.setState({indexes: data})
        });
    },

    /**
     * Renders the component.
     */
    render: function () {
        var table = {
            cols: ["Name", "Index", "Index Hits"],
            align: ["left", "left", "right"],
            rows: this.state.indexes.map(row => [row.name, row.index, numeral(row["hits"]).format('0,0')])
        };

        return (
            React.createElement("div", null, 
                React.createElement("div", {className: "page-header"}, 
                    React.createElement("h1", null, "Performance / Index / Hits")
                ), 

                React.createElement("div", {className: "panel panel-default"}, 
                    React.createElement("div", {className: "panel-body"}, 
                        "The table shows the usage of indexes for each relation (Lattice not yet supported (!))."
                    )
                ), 

                React.createElement(Table, {table: table})
            )
        );
    }
});


/**
 * Indexes page.
 */
var IndexMissesPage = React.createClass({displayName: "IndexMissesPage",
    propTypes: {
        registerRefreshCallback: React.PropTypes.func.isRequired,
        unregisterRefreshCallback: React.PropTypes.func.isRequired,
        notifyConnectionError: React.PropTypes.func.isRequired
    },

    /**
     * The state is an array of indexes where an index is a {name, index, misses} object.
     * @returns {{indexes: Array}}
     */
    getInitialState: function () {
        return {indexes: []};
    },

    /**
     * Refresh the AJAX data on mount. Register the component as refreshable.
     */
    componentDidMount: function () {
        this.refresh();
        this.props.registerRefreshCallback(this.refresh);
    },

    /**
     * Un-register the component as refreshable.
     */
    componentWillUnmount: function () {
        this.props.unregisterRefreshCallback(this.refresh);
    },

    /**
     * Retrieves JSON data from the server.
     */
    refresh: function () {
        Common.ajax(URL + '/performance/index/misses', this.notifyConnectionError, data => {
            this.setState({indexes: data})
        });
    },

    /**
     * Renders the component.
     */
    render: function () {
        var table = {
            cols: ["Name", "Index", "Index Misses"],
            align: ["left", "left", "right"],
            rows: this.state.indexes.map(row => [row.name, row.index, numeral(row["misses"]).format('0,0')])
        };

        return (
            React.createElement("div", null, 
                React.createElement("div", {className: "page-header"}, 
                    React.createElement("h1", null, "Performance / Index / Misses")
                ), 

                React.createElement("div", {className: "panel panel-default"}, 
                    React.createElement("div", {className: "panel-body"}, 
                        "The table shows the indexes misses for each relation. (Lattice not yet supported (!))."
                    )
                ), 

                React.createElement(Table, {table: table})
            )
        );
    }
});

/**
 * Phases page.
 */
var PhasesPage = React.createClass({displayName: "PhasesPage",
    propTypes: {
        registerRefreshCallback: React.PropTypes.func.isRequired,
        unregisterRefreshCallback: React.PropTypes.func.isRequired,
        notifyConnectionError: React.PropTypes.func.isRequired
    },

    /**
     * The state is an array of phases where a phase is {name, time} object.
     */
    getInitialState: function () {
        return {phases: []};
    },

    /**
     * Refresh the AJAX data on mount. Register the component as refreshable.
     */
    componentDidMount: function () {
        this.refresh();
        this.props.registerRefreshCallback(this.refresh);
    },

    /**
     * Un-register the component as refreshable.
     */
    componentWillUnmount: function () {
        this.props.unregisterRefreshCallback(this.refresh);
    },

    /**
     * Retrieves JSON data from the server.
     */
    refresh: function () {
        Common.ajax(URL + '/compiler/phases', this.notifyConnectionError, data => {
            this.setState({phases: data})
        });
    },

    /**
     * Renders the component.
     */
    render: function () {
        var labels = this.state.phases.map(o => o.name);
        var time = this.state.phases.map(o => o.time);

        return (
            React.createElement("div", null, 
                React.createElement("div", {className: "page-header"}, 
                    React.createElement("h1", null, "Compiler / Phases")
                ), 

                React.createElement("div", {className: "panel panel-default"}, 
                    React.createElement("div", {className: "panel-body"}, 
                        "The graph shows the number of miliseconds spent in each phase of the compiler."
                    )
                ), 

                React.createElement(BarChart, {key: Math.random(), width: 600, height: 400, labels: labels, data: time})
            )
        );
    }
});

/**
 * A table component.
 */
var Table = React.createClass({displayName: "Table",
    propTypes: {
        table: React.PropTypes.shape({
            cols: React.PropTypes.array.isRequired,
            rows: React.PropTypes.array.isRequired
        })
    },
    render: function () {
        return (
            React.createElement("table", {className: "table table-condense table-hover"}, 
                React.createElement(TableHeader, {table: this.props.table}), 
                React.createElement(TableBody, {table: this.props.table})
            )
        );
    }
});

/**
 * A table header component.
 */
var TableHeader = React.createClass({displayName: "TableHeader",
    render: function () {
        return (
            React.createElement("thead", null, 
            React.createElement("tr", null, 
                this.props.table.cols.map((col, idx) => React.createElement("th", {
                    className: getAlignment(idx, this.props.table.align)}, col))
            )
            )
        );
    }
});

/**
 * A table body component.
 */
var TableBody = React.createClass({displayName: "TableBody",
    render: function () {
        return (
            React.createElement("tbody", {className: "monospaced"}, 
            this.props.table.rows.map(row => React.createElement(TableRow, {align: this.props.table.align, row: row}))
            )
        );
    }
});

/**
 * A table row component.
 */
var TableRow = React.createClass({displayName: "TableRow",
    render: function () {
        return (
            React.createElement("tr", null, 
                this.props.row.map((elm, idx) => React.createElement("td", {className: getAlignment(idx, this.props.align)}, elm))
            )
        );
    }
});

/**
 * Returns the CSS alignment string corresponding to the given alignment.
 */
function getAlignment(idx, align) {
    if (align === undefined) {
        return "text-left";
    }

    var text = align[idx];
    if (text === "left") {
        return "text-left";
    } else if (text === "center") {
        return "text-center";
    } else {
        return "text-right";
    }
}

/**
 * Chart.js global options.
 */
Chart.defaults.global.animation = false;
Chart.defaults.global.responsive = false;


/**
 * A BarChart component based on Chart.js
 */
var BarChart = React.createClass({displayName: "BarChart",
    propTypes: {
        labels: React.PropTypes.arrayOf(React.PropTypes.string).isRequired,
        data: React.PropTypes.arrayOf(React.PropTypes.number).isRequired,
        width: React.PropTypes.number.isRequired,
        height: React.PropTypes.number.isRequired
    },

    /**
     * Draw the bar chart once the canvas element has been created.
     */
    componentDidMount: function () {
        var barChartData = {
            labels: this.props.labels,
            datasets: [
                {
                    fillColor: "rgba(151,187,205,0.5)",
                    strokeColor: "rgba(151,187,205,0.8)",
                    highlightFill: "rgba(151,187,205,0.75)",
                    highlightStroke: "rgba(151,187,205,1)",
                    data: this.props.data
                }
            ]
        };

        var ctx = this.canvas.getContext("2d");
        this.chart = new Chart(ctx).Bar(barChartData);
    },

    /**
     * Release the resources associated with the bar chart.
     */
    componentWillUnmount: function () {
        this.chart.destroy();
    },

    /**
     * Render the bar chart.
     *
     * NB: The canvas element must be re-created before a bar chart can be redrawn.
     */
    render: function () {
        return React.createElement("canvas", {width: this.props.width, height: this.props.height, ref: (ref) => this.canvas = ref})
    }
});


/**
 * A LineChart component based on Chart.js
 */
var LineChart = React.createClass({displayName: "LineChart",
    propTypes: {
        labels: React.PropTypes.arrayOf(React.PropTypes.string).isRequired,
        data: React.PropTypes.arrayOf(React.PropTypes.number).isRequired,
        width: React.PropTypes.number.isRequired,
        height: React.PropTypes.number.isRequired
    },

    /**
     * Draw the line chart once the canvas element has been created.
     */
    componentDidMount: function () {
        var dataset = LineChart.getBlueDataSet(this.props.data);

        if (this.props.theme === "green") {
            dataset = LineChart.getGreenDataSet(this.props.data);
        }
        if (this.props.theme === "magenta") {
            dataset = LineChart.getMagentaDataSet(this.props.data);
        }
        if (this.props.theme === "orangered") {
            dataset = LineChart.getOrangeRedDataSet(this.props.data);
        }

        var lineChartData = {
            labels: this.props.labels,
            datasets: [dataset]
        };

        var ctx = this.canvas.getContext("2d");
        this.chart = new Chart(ctx).Line(lineChartData);
    },

    /**
     * Release the resources associated with the line chart.
     */
    componentWillUnmount: function () {
        this.chart.destroy();
    },

    /**
     * Render the line chart.
     *
     * NB: The canvas element must be re-created before a line chart can be redrawn.
     */
    render: function () {
        return React.createElement("canvas", {width: this.props.width, height: this.props.height, ref: (ref) => this.canvas = ref})
    }
});

/**
 * Returns a data set colored blue.
 */
LineChart.getBlueDataSet = function (data) {
    return {
        fillColor: "rgba(151,187,205,0.2)",
        strokeColor: "rgba(151,187,205,1)",
        pointColor: "rgba(151,187,205,1)",
        pointStrokeColor: "#fff",
        pointHighlightFill: "#fff",
        pointHighlightStroke: "rgba(151,187,205,1)",
        data: data
    }
};

/**
 * Returns a data set colored green.
 */
LineChart.getGreenDataSet = function (data) {
    return {
        fillColor: "rgba(187,205,151,0.2)",
        strokeColor: "rgba(187,205,151,1)",
        pointColor: "rgba(187,205,151,1)",
        pointStrokeColor: "#fff",
        pointHighlightFill: "#fff",
        pointHighlightStroke: "rgba(187,205,151,1)",
        data: data
    }
};

/**
 * Returns a data set colored magenta.
 */
LineChart.getMagentaDataSet = function (data) {
    return {
        fillColor: "rgb(243,234,245)",
        strokeColor: "rgb(195,151,205)",
        pointColor: "rgb(195,151,205)",
        pointStrokeColor: "#fff",
        pointHighlightFill: "#fff",
        pointHighlightStroke: "rgb(243,234,245)",
        data: data
    }
};

/**
 * Returns a data set colored orangered.
 */
LineChart.getOrangeRedDataSet = function (data) {
    return {
        fillColor: "rgb(245, 234, 234)",
        strokeColor: "rgb(205, 152, 151)",
        pointColor: "rgb(205, 152, 151)",
        pointStrokeColor: "#fff",
        pointHighlightFill: "#fff",
        pointHighlightStroke: "rgb(245, 234, 234)",
        data: data
    }
};

/**
 * Mount the App component when the document has loaded.
 */
$(document).ready(function () {
    var root = document.getElementById("container");
    ReactDOM.render(React.createElement(App, null), root);
});
