class ComplexDoubleDouble {

    /**
     * Complex number backed by DoubleDouble values.
     *
     * z = real + imaginary * i
     *
     * @param {DoubleDouble|number|string} real
     * @param {DoubleDouble|number|string} imaginary
     */
    constructor(real = 0, imaginary = 0) {

        this.real =
            ComplexDoubleDouble.toDoubleDouble(real);

        this.imaginary =
            ComplexDoubleDouble.toDoubleDouble(imaginary);
    }


    /* =====================================================
       Conversion helper
       ===================================================== */

    static toDoubleDouble(value) {

        if (value instanceof DoubleDouble) {

            return value.clone();
        }


        if (typeof value === "string") {

            return DoubleDouble.fromString(value);
        }


        if (typeof value === "number") {

            return DoubleDouble.fromNumber(value);
        }


        throw new TypeError(
            "ComplexDoubleDouble values must be DoubleDouble, number, or string."
        );
    }


    /* =====================================================
       Factory methods
       ===================================================== */

    static zero() {

        return new ComplexDoubleDouble(0, 0);
    }


    static fromNumbers(real, imaginary) {

        return new ComplexDoubleDouble(
            DoubleDouble.fromNumber(real),
            DoubleDouble.fromNumber(imaginary)
        );
    }


    static fromStrings(real, imaginary) {

        return new ComplexDoubleDouble(
            DoubleDouble.fromString(real),
            DoubleDouble.fromString(imaginary)
        );
    }


    /* =====================================================
       Getters
       ===================================================== */

    getReal() {

        return this.real;
    }


    getImaginary() {

        return this.imaginary;
    }


    /* =====================================================
       Setters
       ===================================================== */

    setReal(value) {

        this.real =
            ComplexDoubleDouble.toDoubleDouble(value);

        return this;
    }


    setImaginary(value) {

        this.imaginary =
            ComplexDoubleDouble.toDoubleDouble(value);

        return this;
    }


    set(real, imaginary) {

        this.real =
            ComplexDoubleDouble.toDoubleDouble(real);

        this.imaginary =
            ComplexDoubleDouble.toDoubleDouble(imaginary);

        return this;
    }


    /* =====================================================
       Addition

       (a + bi) + (c + di)

       = (a + c) + (b + d)i
       ===================================================== */

    add(other) {

        this.requireComplex(other);


        return new ComplexDoubleDouble(
            this.real.add(other.real),
            this.imaginary.add(other.imaginary)
        );
    }


    /* =====================================================
       Subtraction

       (a + bi) - (c + di)

       = (a - c) + (b - d)i
       ===================================================== */

    subtract(other) {

        this.requireComplex(other);


        return new ComplexDoubleDouble(
            this.real.subtract(other.real),
            this.imaginary.subtract(other.imaginary)
        );
    }


    /* =====================================================
       Complex multiplication

       (a + bi)(c + di)

       = (ac - bd) + (ad + bc)i
       ===================================================== */

    multiply(other) {

        this.requireComplex(other);


        const ac =
            this.real.multiply(other.real);

        const bd =
            this.imaginary.multiply(
                other.imaginary
            );

        const ad =
            this.real.multiply(
                other.imaginary
            );

        const bc =
            this.imaginary.multiply(
                other.real
            );


        return new ComplexDoubleDouble(
            ac.subtract(bd),
            ad.add(bc)
        );
    }


    /* =====================================================
       Scalar multiplication
       ===================================================== */

    multiplyScalar(value) {

        const scalar =
            ComplexDoubleDouble.toDoubleDouble(value);


        return new ComplexDoubleDouble(
            this.real.multiply(scalar),
            this.imaginary.multiply(scalar)
        );
    }


    /* =====================================================
       Square

       (a + bi)^2

       = (a² - b²) + 2abi
       ===================================================== */

    square() {

        const realSquared =
            this.real.square();

        const imaginarySquared =
            this.imaginary.square();


        const realPart =
            realSquared.subtract(
                imaginarySquared
            );


        const imaginaryPart =
            this.real
                .multiply(this.imaginary)
                .multiply(
                    DoubleDouble.fromNumber(2)
                );


        return new ComplexDoubleDouble(
            realPart,
            imaginaryPart
        );
    }


    /* =====================================================
       Mandelbrot iteration

       z = z² + c

       This is convenient for testing and non-hot-path use.

       The production MandelbrotProcessor should eventually
       perform the same operations directly to minimise
       temporary object creation.
       ===================================================== */

    mandelbrotStep(c) {

        this.requireComplex(c);


        const realSquared =
            this.real.square();

        const imaginarySquared =
            this.imaginary.square();


        const nextImaginary =
            this.real
                .multiply(this.imaginary)
                .multiply(
                    DoubleDouble.fromNumber(2)
                )
                .add(c.imaginary);


        const nextReal =
            realSquared
                .subtract(imaginarySquared)
                .add(c.real);


        return new ComplexDoubleDouble(
            nextReal,
            nextImaginary
        );
    }


    /* =====================================================
       Magnitude squared

       |z|² = real² + imaginary²

       We deliberately avoid sqrt().
       Mandelbrot escape detection only requires |z|².
       ===================================================== */

    magnitudeSquared() {

        return this.real
            .square()
            .add(
                this.imaginary.square()
            );
    }


    /* =====================================================
       Approximate magnitude

       Only intended for display / smooth colouring.

       The precision-sensitive Mandelbrot calculation should
       use magnitudeSquared() instead.
       ===================================================== */

    magnitude() {

        const value =
            this.magnitudeSquared()
                .toNumber();


        return Math.sqrt(value);
    }


    /* =====================================================
       Conjugate

       conjugate(a + bi) = a - bi
       ===================================================== */

    conjugate() {

        return new ComplexDoubleDouble(
            this.real,
            this.imaginary.negate()
        );
    }


    /* =====================================================
       Negation
       ===================================================== */

    negate() {

        return new ComplexDoubleDouble(
            this.real.negate(),
            this.imaginary.negate()
        );
    }


    /* =====================================================
       Distance squared

       Useful for high-precision periodicity detection.

       (a - c)² + (b - d)²
       ===================================================== */

    distanceSquared(other) {

        this.requireComplex(other);


        const dx =
            this.real.subtract(
                other.real
            );

        const dy =
            this.imaginary.subtract(
                other.imaginary
            );


        return dx
            .square()
            .add(
                dy.square()
            );
    }


    /* =====================================================
       Exact equality
       ===================================================== */

    equals(other) {

        if (
            !(other instanceof ComplexDoubleDouble)
        ) {

            return false;
        }


        return (
            this.real.equals(other.real) &&
            this.imaginary.equals(
                other.imaginary
            )
        );
    }


    /* =====================================================
       Approximate equality

       Useful for periodicity detection.
       ===================================================== */

    approximatelyEquals(
        other,
        epsilon
    ) {

        this.requireComplex(other);


        const tolerance =
            ComplexDoubleDouble.toDoubleDouble(
                epsilon
            );


        const realDifference =
            this.real
                .subtract(other.real)
                .abs();


        const imaginaryDifference =
            this.imaginary
                .subtract(other.imaginary)
                .abs();


        return (
            realDifference.compareTo(
                tolerance
            ) <= 0
            &&
            imaginaryDifference.compareTo(
                tolerance
            ) <= 0
        );
    }


    /* =====================================================
       Zero
       ===================================================== */

    isZero() {

        return (
            this.real.isZero() &&
            this.imaginary.isZero()
        );
    }


    /* =====================================================
       Number conversion

       IMPORTANT:

       This loses DoubleDouble precision and therefore
       should only be used for UI/display/colour calculations.
       ===================================================== */

    toNumbers() {

        return {

            real:
                this.real.toNumber(),

            imaginary:
                this.imaginary.toNumber()
        };
    }


    /* =====================================================
       Copy
       ===================================================== */

    clone() {

        return new ComplexDoubleDouble(
            this.real.clone(),
            this.imaginary.clone()
        );
    }


    /* =====================================================
       Validation
       ===================================================== */

    requireComplex(value) {

        if (
            !(
                value instanceof
                ComplexDoubleDouble
            )
        ) {

            throw new TypeError(
                "Expected a ComplexDoubleDouble."
            );
        }
    }


    /* =====================================================
       String
       ===================================================== */

    toString() {

        const real =
            this.real.toString();

        const imaginary =
            this.imaginary.toString();


        return (
            `(${real} + ${imaginary}i)`
        );
    }
}