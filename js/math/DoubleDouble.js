class DoubleDouble {

    /*
     * Dekker splitting constant for IEEE-754 binary64.
     *
     * 2^27 + 1
     */
    static SPLITTER = 134217729.0;


    constructor(hi = 0.0, lo = 0.0) {

        this.hi = hi;
        this.lo = lo;
    }


    /* =====================================================
       Factory methods
       ===================================================== */

    static fromNumber(value) {

        if (
            typeof value !== "number" ||
            !Number.isFinite(value)
        ) {

            throw new TypeError(
                "DoubleDouble.fromNumber requires a finite number."
            );
        }


        return new DoubleDouble(
            value,
            0.0
        );
    }


    /*
     * Parse a decimal string without first converting the
     * entire value to a JavaScript Number.
     *
     * This is critical for deep Mandelbrot coordinates.
     *
     * For example:
     *
     * "-0.743643887037151007923..."
     *
     * must NOT first pass through parseFloat(), otherwise
     * the extra digits have already been destroyed.
     */
    static fromString(value) {

        if (typeof value !== "string") {

            throw new TypeError(
                "DoubleDouble.fromString requires a string."
            );
        }


        let text =
            value.trim();


        if (text.length === 0) {

            throw new Error(
                "Cannot parse an empty DoubleDouble."
            );
        }


        let sign = 1;


        if (text[0] === "-") {

            sign = -1;
            text = text.substring(1);

        } else if (text[0] === "+") {

            text = text.substring(1);
        }


        /*
         * Separate scientific exponent.
         */

        let exponent = 0;

        const exponentIndex =
            text.search(/[eE]/);


        if (exponentIndex !== -1) {

            const exponentText =
                text.substring(
                    exponentIndex + 1
                );


            exponent =
                Number(exponentText);


            if (
                !Number.isInteger(exponent)
            ) {

                throw new Error(
                    "Invalid DoubleDouble exponent."
                );
            }


            text =
                text.substring(
                    0,
                    exponentIndex
                );
        }


        /*
         * Validate decimal section.
         */

        if (
            !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)
        ) {

            throw new Error(
                `Invalid DoubleDouble value: ${value}`
            );
        }


        const decimalIndex =
            text.indexOf(".");


        let fractionalDigits = 0;


        if (decimalIndex !== -1) {

            fractionalDigits =
                text.length -
                decimalIndex -
                1;


            text =
                text.substring(
                    0,
                    decimalIndex
                ) +
                text.substring(
                    decimalIndex + 1
                );
        }


        /*
         * Remove leading zeros.
         */

        text =
            text.replace(/^0+/, "");


        if (text.length === 0) {

            return DoubleDouble.ZERO.clone();
        }


        /*
         * Build the significand digit-by-digit using DD
         * arithmetic.
         *
         * result = result * 10 + digit
         */

        let result =
            DoubleDouble.ZERO.clone();


        const ten =
            DoubleDouble.TEN;


        for (
            let i = 0;
            i < text.length;
            i++
        ) {

            const digit =
                text.charCodeAt(i) - 48;


            result =
                result
                    .multiply(ten)
                    .addNumber(digit);
        }


        /*
         * Decimal position + scientific notation.
         */

        const decimalExponent =
            exponent -
            fractionalDigits;


        if (decimalExponent !== 0) {

            result =
                result.multiply(
                    DoubleDouble.pow10(
                        decimalExponent
                    )
                );
        }


        if (sign < 0) {

            result =
                result.negate();
        }


        return result;
    }


    static valueOf(value) {

        if (value instanceof DoubleDouble) {

            return value;
        }


        if (typeof value === "number") {

            return DoubleDouble.fromNumber(
                value
            );
        }


        if (typeof value === "string") {

            return DoubleDouble.fromString(
                value
            );
        }


        throw new TypeError(
            "Cannot convert value to DoubleDouble."
        );
    }


    /* =====================================================
       Error-free addition primitives
       ===================================================== */

    static twoSum(a, b) {

        const sum =
            a + b;


        const bb =
            sum - a;


        const error =
            (a - (sum - bb)) +
            (b - bb);


        return [
            sum,
            error
        ];
    }


    static quickTwoSum(a, b) {

        const sum =
            a + b;


        const error =
            b - (sum - a);


        return [
            sum,
            error
        ];
    }


    /* =====================================================
       Error-free multiplication primitive

       Dekker multiplication.
       ===================================================== */

    static twoProduct(a, b) {

        const product =
            a * b;


        /*
         * Overflow/NaN isn't expected for Mandelbrot
         * coordinate arithmetic, but preserve JS behaviour
         * rather than attempting Dekker splitting on it.
         */

        if (!Number.isFinite(product)) {

            return [
                product,
                0.0
            ];
        }


        const splitA =
            DoubleDouble.SPLITTER * a;

        const aHigh =
            splitA -
            (splitA - a);

        const aLow =
            a - aHigh;


        const splitB =
            DoubleDouble.SPLITTER * b;

        const bHigh =
            splitB -
            (splitB - b);

        const bLow =
            b - bHigh;


        const error =
            (
                aHigh * bHigh -
                product
            )
            +
            aHigh * bLow
            +
            aLow * bHigh
            +
            aLow * bLow;


        return [
            product,
            error
        ];
    }


    /* =====================================================
       Addition
       ===================================================== */

    add(other) {

        other =
            DoubleDouble.valueOf(other);


        /*
         * Add the high components exactly.
         */

        const high =
            DoubleDouble.twoSum(
                this.hi,
                other.hi
            );


        /*
         * Add the low components.
         */

        const low =
            DoubleDouble.twoSum(
                this.lo,
                other.lo
            );


        /*
         * Combine both error components.
         */

        const correction =
            high[1] +
            low[0];


        const combined =
            DoubleDouble.quickTwoSum(
                high[0],
                correction
            );


        const finalCorrection =
            combined[1] +
            low[1];


        const result =
            DoubleDouble.quickTwoSum(
                combined[0],
                finalCorrection
            );


        return new DoubleDouble(
            result[0],
            result[1]
        );
    }


    addNumber(value) {

        const sum =
            DoubleDouble.twoSum(
                this.hi,
                value
            );


        const correction =
            sum[1] +
            this.lo;


        const result =
            DoubleDouble.quickTwoSum(
                sum[0],
                correction
            );


        return new DoubleDouble(
            result[0],
            result[1]
        );
    }


    /* =====================================================
       Subtraction
       ===================================================== */

    subtract(other) {

        other =
            DoubleDouble.valueOf(other);


        return this.add(
            new DoubleDouble(
                -other.hi,
                -other.lo
            )
        );
    }


    subtractNumber(value) {

        return this.addNumber(
            -value
        );
    }


    /* =====================================================
       Negation
       ===================================================== */

    negate() {

        return new DoubleDouble(
            -this.hi,
            -this.lo
        );
    }


    /* =====================================================
       Multiplication
       ===================================================== */

    multiply(other) {

        other =
            DoubleDouble.valueOf(other);


        /*
         * Exact product of the high components.
         */

        const product =
            DoubleDouble.twoProduct(
                this.hi,
                other.hi
            );


        /*
         * Cross terms.
         *
         * lo * lo is also retained. It is normally extremely
         * small but costs little here and gives us a cleaner
         * general-purpose DD implementation.
         */

        const correction =
            product[1]
            +
            this.hi * other.lo
            +
            this.lo * other.hi
            +
            this.lo * other.lo;


        const result =
            DoubleDouble.quickTwoSum(
                product[0],
                correction
            );


        return new DoubleDouble(
            result[0],
            result[1]
        );
    }


    multiplyNumber(value) {

        const product =
            DoubleDouble.twoProduct(
                this.hi,
                value
            );


        const correction =
            product[1] +
            this.lo * value;


        const result =
            DoubleDouble.quickTwoSum(
                product[0],
                correction
            );


        return new DoubleDouble(
            result[0],
            result[1]
        );
    }


    /* =====================================================
       Square

       Slightly cheaper than generic multiplication.
       ===================================================== */

    square() {

        const product =
            DoubleDouble.twoProduct(
                this.hi,
                this.hi
            );


        const correction =
            product[1]
            +
            2.0 * this.hi * this.lo
            +
            this.lo * this.lo;


        const result =
            DoubleDouble.quickTwoSum(
                product[0],
                correction
            );


        return new DoubleDouble(
            result[0],
            result[1]
        );
    }


    /* =====================================================
       Division
       ===================================================== */

    divide(other) {

        other =
            DoubleDouble.valueOf(other);


        if (other.isZero()) {

            throw new RangeError(
                "Division by zero."
            );
        }


        /*
         * First approximation.
         */

        const q1 =
            this.hi /
            other.hi;


        /*
         * Calculate the residual:
         *
         * r = this - other*q1
         */

        let remainder =
            this.subtract(
                other.multiplyNumber(q1)
            );


        /*
         * Second correction.
         */

        const q2 =
            remainder.hi /
            other.hi;


        remainder =
            remainder.subtract(
                other.multiplyNumber(q2)
            );


        /*
         * Third correction gives us essentially the useful
         * precision available from a double-double.
         */

        const q3 =
            remainder.hi /
            other.hi;


        return DoubleDouble
            .fromNumber(q1)
            .addNumber(q2)
            .addNumber(q3);
    }


    divideNumber(value) {

        if (value === 0) {

            throw new RangeError(
                "Division by zero."
            );
        }


        return this.divide(
            DoubleDouble.fromNumber(value)
        );
    }


    /* =====================================================
       Reciprocal
       ===================================================== */

    reciprocal() {

        return DoubleDouble.ONE.divide(
            this
        );
    }


    /* =====================================================
       Absolute value
       ===================================================== */

    abs() {

        if (this.isNegative()) {

            return this.negate();
        }


        return this.clone();
    }


    /* =====================================================
       Comparison
       ===================================================== */

    compareTo(other) {

        other =
            DoubleDouble.valueOf(other);


        if (this.hi < other.hi) {

            return -1;
        }


        if (this.hi > other.hi) {

            return 1;
        }


        if (this.lo < other.lo) {

            return -1;
        }


        if (this.lo > other.lo) {

            return 1;
        }


        return 0;
    }


    lessThan(other) {

        return this.compareTo(other) < 0;
    }


    lessThanOrEqual(other) {

        return this.compareTo(other) <= 0;
    }


    greaterThan(other) {

        return this.compareTo(other) > 0;
    }


    greaterThanOrEqual(other) {

        return this.compareTo(other) >= 0;
    }


    equals(other) {

        if (!(other instanceof DoubleDouble)) {

            return false;
        }


        return (
            this.hi === other.hi &&
            this.lo === other.lo
        );
    }


    /* =====================================================
       Sign
       ===================================================== */

    isZero() {

        return (
            this.hi === 0.0 &&
            this.lo === 0.0
        );
    }


    isPositive() {

        return (
            this.hi > 0.0 ||
            (
                this.hi === 0.0 &&
                this.lo > 0.0
            )
        );
    }


    isNegative() {

        return (
            this.hi < 0.0 ||
            (
                this.hi === 0.0 &&
                this.lo < 0.0
            )
        );
    }


    signum() {

        if (this.isPositive()) {

            return 1;
        }


        if (this.isNegative()) {

            return -1;
        }


        return 0;
    }


    /* =====================================================
       Powers
       ===================================================== */

    static pow10(exponent) {

        if (!Number.isInteger(exponent)) {

            throw new TypeError(
                "Power-of-ten exponent must be an integer."
            );
        }


        if (exponent === 0) {

            return DoubleDouble.ONE.clone();
        }


        let power =
            Math.abs(exponent);


        let base =
            DoubleDouble.TEN.clone();


        let result =
            DoubleDouble.ONE.clone();


        /*
         * Exponentiation by squaring.
         */

        while (power > 0) {

            if (power % 2 === 1) {

                result =
                    result.multiply(base);
            }


            power =
                Math.floor(power / 2);


            if (power > 0) {

                base =
                    base.square();
            }
        }


        if (exponent < 0) {

            result =
                DoubleDouble.ONE.divide(
                    result
                );
        }


        return result;
    }


    /* =====================================================
       Conversion
       ===================================================== */

    toNumber() {

        return this.hi + this.lo;
    }


    valueOf() {

        return this.toNumber();
    }


    /* =====================================================
       Accessors
       ===================================================== */

    getHigh() {

        return this.hi;
    }


    getLow() {

        return this.lo;
    }


    /* =====================================================
       Copy
       ===================================================== */

    clone() {

        return new DoubleDouble(
            this.hi,
            this.lo
        );
    }


    /* =====================================================
       String representation

       This is primarily for debugging/display.

       Do NOT use Number.toString() as a way of serialising
       deep zoom coordinates for later restoration because
       that would throw away the low component.
       ===================================================== */

    toString() {

        if (this.lo === 0.0) {

            return this.hi.toString();
        }


        return (
            this.hi.toPrecision(17) +
            " + " +
            this.lo.toExponential(17)
        );
    }


    /* =====================================================
       Debug representation
       ===================================================== */

    toDebugString() {

        return (
            "DoubleDouble(" +
            `hi=${this.hi.toPrecision(17)}, ` +
            `lo=${this.lo.toExponential(17)}` +
            ")"
        );
    }
}


/* =========================================================
   Constants

   These should be treated as immutable values. Arithmetic
   methods never mutate them.
   ========================================================= */

DoubleDouble.ZERO =
    Object.freeze(
        new DoubleDouble(0.0, 0.0)
    );


DoubleDouble.ONE =
    Object.freeze(
        new DoubleDouble(1.0, 0.0)
    );


DoubleDouble.TWO =
    Object.freeze(
        new DoubleDouble(2.0, 0.0)
    );


DoubleDouble.TEN =
    Object.freeze(
        new DoubleDouble(10.0, 0.0)
    );


DoubleDouble.QUARTER =
    Object.freeze(
        new DoubleDouble(0.25, 0.0)
    );