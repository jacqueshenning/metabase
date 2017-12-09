/* @flow */

import React, { Component } from "react";
import { t } from 'c-3po';
import cx from 'classnames';
import moment from "moment";
import _ from "underscore";

import SpecificDatePicker from "./SpecificDatePicker";
import RelativeDatePicker, { DATE_PERIODS, UnitPicker } from "./RelativeDatePicker";
import DateOperatorSelector from "../DateOperatorSelector";
import Calendar from "metabase/components/Calendar";

import Query from "metabase/lib/query";
import { mbqlEq } from "metabase/lib/query/util";


import type {
    FieldFilter, TimeIntervalFilter,
    DatetimeUnit,
    ConcreteField,
    LocalFieldReference, ForeignFieldReference, ExpressionReference
} from "metabase/meta/types/Query";

const SingleDatePicker = ({ filter: [op, field, value], onFilterChange, hideTimeSelectors }) =>
    <div className="mx2">
        <SpecificDatePicker
            value={value}
            onChange={(value) => onFilterChange([op, field, value])}
            hideTimeSelectors={hideTimeSelectors}
            calendar
        />
    </div>

const MultiDatePicker = ({ filter: [op, field, startValue, endValue], onFilterChange , hideTimeSelectors}) =>
    <div className="mx2 mb1">
        <div className="Grid Grid--1of2 Grid--gutters">
            <div className="Grid-cell">
                <SpecificDatePicker
                    value={startValue}
                    hideTimeSelectors={hideTimeSelectors}
                    onChange={(value) => onFilterChange([op, field, value, endValue])}
                />
            </div>
            <div className="Grid-cell">
                <SpecificDatePicker
                    value={endValue}
                    hideTimeSelectors={hideTimeSelectors}
                    onChange={(value) => onFilterChange([op, field, startValue, value])}
                />
            </div>
        </div>
        <div className="Calendar--noContext">
            <Calendar
                initial={startValue ? moment(startValue) : moment()}
                selected={startValue && moment(startValue)}
                selectedEnd={endValue && moment(endValue)}
                onChange={(startValue, endValue) => onFilterChange([op, field, startValue, endValue])}
                isDual
            />
        </div>
    </div>

const PreviousPicker =  (props) =>
    <RelativeDatePicker {...props} formatter={(value) => value * -1} />

const NextPicker = (props) =>
    <RelativeDatePicker {...props} />

type CurrentPickerProps = {
    filter: TimeIntervalFilter,
    onFilterChange: (filter: TimeIntervalFilter) => void
};

type CurrentPickerState = {
    showUnits: boolean
};

class CurrentPicker extends Component {
    props: CurrentPickerProps;
    state: CurrentPickerState;

    state = {
        showUnits: false
    };

    render() {
        const { filter: [operator, field, intervals, unit], onFilterChange } = this.props
        return (
            <div className="mx2">
                <UnitPicker
                    value={unit}
                    open={this.state.showUnits}
                    onChange={(value) => {
                        onFilterChange([operator, field, intervals, value]);
                        this.setState({ showUnits: false });
                    }}
                    togglePicker={() => this.setState({ showUnits: !this.state.showUnits })}
                    formatter={(val) => val}
                    periods={DATE_PERIODS}
                />
            </div>
        )
    }
}


const getIntervals = ([op, field, value, unit]) => mbqlEq(op, "time-interval") && typeof value === "number" ? Math.abs(value) : 30;
const getUnit      = ([op, field, value, unit]) => mbqlEq(op, "time-interval") && unit ? unit : "day";
const getOptions   = ([op, field, value, unit, options]) => options || {};

const getDate = (value) => {
    if (typeof value !== "string" || !moment(value).isValid()) {
        value = moment().format("YYYY-MM-DD");
    }
    return value;
}

const hasTime = (value) => typeof value === "string" && /T\d{2}:\d{2}:\d{2}$/.test(value);

function getDateTimeField(field: ConcreteField, bucketing: ?DatetimeUnit): ConcreteField {
    let target = getDateTimeFieldTarget(field);
    if (bucketing) {
        // $FlowFixMe
        return ["datetime-field", target, bucketing];
    } else {
        return target;
    }
}

function getDateTimeFieldTarget(field: ConcreteField): LocalFieldReference|ForeignFieldReference|ExpressionReference {
    if (Query.isDatetimeField(field)) {
        // $FlowFixMe:
        return (field[1]: LocalFieldReference|ForeignFieldReference|ExpressionReference);
    } else {
        // $FlowFixMe
        return field;
    }
}

// wraps values in "datetime-field" is any of them have a time component
function getDateTimeFieldAndValues(filter: FieldFilter, count: number): [ConcreteField, any] {
    const values = filter.slice(2, 2 + count).map(value => value && getDate(value));
    const bucketing = _.any(values, hasTime) ? "minute" : null;
    const field = getDateTimeField(filter[1], bucketing);
    // $FlowFixMe
    return [field, ...values];
}


export type OperatorName = string;

export type Operator = {
    name: OperatorName,
    widget?: any,
    init: (filter: FieldFilter) => any,
    test: (filter: FieldFilter) => boolean
}

const ALL_TIME_OPERATOR = {
    name: t`All Time`,
    init: () => null,
    test: (op) => op === null
}

export const DATE_OPERATORS: Operator[] = [
    {
        name: t`Previous`,
        init: (filter) => ["time-interval", getDateTimeField(filter[1]), -getIntervals(filter), getUnit(filter), getOptions(filter)],
        // $FlowFixMe
        test: ([op, field, value]) => mbqlEq(op, "time-interval") && value < 0 || Object.is(value, -0),
        widget: PreviousPicker,
    },
    {
        name: t`Next`,
        init: (filter) => ["time-interval", getDateTimeField(filter[1]), getIntervals(filter), getUnit(filter), getOptions(filter)],
        // $FlowFixMe
        test: ([op, field, value]) => mbqlEq(op, "time-interval") && value >= 0,
        widget: NextPicker,
    },
    {
        name: t`Current`,
        init: (filter) => ["time-interval", getDateTimeField(filter[1]), "current", getUnit(filter), getOptions(filter)],
        test: ([op, field, value]) => mbqlEq(op, "time-interval") && value === "current",
        widget: CurrentPicker,
    },
    {
        name: t`Before`,
        init: (filter) =>  ["<", ...getDateTimeFieldAndValues(filter, 1)],
        test: ([op]) => op === "<",
        widget: SingleDatePicker,
    },
    {
        name: t`After`,
        init: (filter) => [">", ...getDateTimeFieldAndValues(filter, 1)],
        test: ([op]) => op === ">",
        widget: SingleDatePicker,
    },
    {
        name: t`On`,
        init: (filter) => ["=", ...getDateTimeFieldAndValues(filter, 1)],
        test: ([op]) => op === "=",
        widget: SingleDatePicker,
    },
    {
        name: t`Between`,
        init: (filter) => ["BETWEEN", ...getDateTimeFieldAndValues(filter, 2)],
        test: ([op]) => mbqlEq(op, "between"),
        widget: MultiDatePicker,
    },

];

export const EMPTINESS_OPERATORS: Operator[] = [
    {
        name: t`Is Empty`,
        init: (filter) => ["IS_NULL", getDateTimeField(filter[1])],
        test: ([op]) => op === "IS_NULL"
    },
    {
        name: t`Not Empty`,
        init: (filter) => ["NOT_NULL", getDateTimeField(filter[1])],
        test: ([op]) => op === "NOT_NULL"
    }
];

export const ALL_OPERATORS: Operator[] = DATE_OPERATORS.concat(EMPTINESS_OPERATORS);

type Props = {
    className?: string,
    filter: FieldFilter,
    onFilterChange: (filter: FieldFilter) => void,
    hideEmptinessOperators?: boolean, // Don't show is empty / not empty dialog
    hideTimeSelectors?: boolean,
    includeAllTime?: boolean,
}

type State = {
    operators: Operator[]
}

export default class DatePicker extends Component {
    props: Props;
    state: State = {
        operators: []
    };

    componentWillMount() {
        const operators = this.props.hideEmptinessOperators ? DATE_OPERATORS : ALL_OPERATORS;

        const operator = this._getOperator(operators) || operators[0];
        this.props.onFilterChange(operator.init(this.props.filter));

        this.setState({ operators })
    }

    _getOperator(operators: Operator[]) {
        return _.find(operators, (o) => o.test(this.props.filter));
    }

    render() {
        const { filter, onFilterChange, includeAllTime } = this.props;
        let { operators } = this.state;
        if (includeAllTime) {
            operators = [ALL_TIME_OPERATOR, ...operators];
        }

        const operator = this._getOperator(operators);
        const Widget = operator && operator.widget;

        // certain types of operators need to have a horizontal layout
        // where the value is chosen next to the operator selector
        // TODO - there's no doubt a cleaner _ way to do this
        const needsHorizontalLayout = operator && (
            operator.name === "Current"  ||
            operator.name === "Previous" ||
            operator.name === "Next"
        );

        return (
            // apply flex to align the operator selector and the "Widget" if necessary
            <div className={cx("border-top pt2", { "flex align-center": needsHorizontalLayout })}>
                <DateOperatorSelector
                    operator={operator && operator.name}
                    operators={operators}
                    onOperatorChange={operator => onFilterChange(operator.init(filter))}
                />
                { Widget &&
                    <Widget
                        {...this.props}
                        filter={filter}
                        hideHoursAndMinutes={this.props.hideTimeSelectors}
                        onFilterChange={filter => {
                            if (operator && operator.init) {
                                onFilterChange(operator.init(filter));
                            } else {
                                onFilterChange(filter);
                            }
                        }}
                    />
                }
            </div>
        )
    }
}
