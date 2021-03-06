/**
 * An implementation of the constant propagation lattice.
 */
namespace Domain/Constant {

    ///
    /// The elements of the constant propagation lattice.
    ///
    enum Constant {
          case Top,

        case Cst(Int),

          case Bot
    }

    ///
    /// Returns `true` iff `e1` is equal to `e2`.
    ///
    def equ(e1: Constant, e2: Constant): Bool = e1 == e2

    ///
    /// Returns `true` iff `e1` is less than or equal to `e2`.
    ///
    #reflexive #antiSymmetric #transitive #leastElement(Bot) #greatestElement(Top)
    def leq(e1: Constant, e2: Constant): Bool = match (e1, e2) with {
        case (Bot, _)           => true
        case (Cst(n1), Cst(n2)) => n1 == n2
        case (_, Top)           => true
        case _                  => false
    }

    ///
    /// Returns the least upper bound of `e1` and `e2`.
    ///
    #upperBound #leastUpperBound #commutative #associative
    def lub(e1: Constant, e2: Constant): Constant = match (e1, e2) with {
        case (Bot, x)           => x
        case (x, Bot)           => x
        case (Cst(n1), Cst(n2)) => if (n1 == n2) e1 else Top
        case _                  => Top
    }

    ///
    /// Returns the greatest lower bound of `e1` and `e2`.
    ///
    #lowerBound #greatestLowerBound #commutative #associative
    def glb(e1: Constant, e2: Constant): Constant = match (e1, e2) with {
        case (Top, x)           => x
        case (x, Top)           => x
        case (Cst(n1), Cst(n2)) => if (n1 == n2) e1 else Bot
        case _                  => Bot
    }

    ///
    /// The lattice height function.
    ///
    #nonNegative #decreasing(equ, leq)
    pub def height(e: Constant): BigInt = match e with {
        case Top    => 0ii
        case Cst(n) => 1ii
        case Bot    => 2ii
    }

    ///
    /// Abstracts a concrete integer into the Sign domain.
    ///
    def alpha(i: Int): Constant = Cst(i)

    /**
     * Over-approximates integer `increment`.
     */
    #safe1(x -> x + 1)
    #strict1 #monotone1
    def inc(e: Constant): Constant = match e with {
        case Bot    => Bot
        case Cst(n) => Cst(n + 1)
        case Top    => Top
    }

    ///
    /// Over-approximates integer `decrement`.
    ///
    #safe1(x -> x - 1)
    #strict1 #monotone1
    def dec(e: Constant): Constant = match e with {
        case Bot    => Bot
        case Cst(n) => Cst(n - 1)
        case Top    => Top
    }

    ///
    /// Over-approximates integer `addition`.
    ///
    #safe2((x, y) -> x + y)
    #strict2 #monotone2 #commutative #associative
    def plus(e1: Constant, e2: Constant): Constant = match (e1, e2) with {
        case (Bot, _)           => Bot
        case (_, Bot)           => Bot
        case (Cst(n1), Cst(n2)) => Cst(n1 + n2)
        case _                  => Top
    }

    ///
    /// Over-approximates integer `subtraction`.
    ///
    #safe2((x, y) -> x - y)
    #strict2 #monotone2
    def minus(e1: Constant, e2: Constant): Constant = match (e1, e2) with {
        case (Bot, _)           => Bot
        case (_, Bot)           => Bot
        case (Cst(n1), Cst(n2)) => Cst(n1 - n2)
        case _                  => Top
    }

    ///
    /// Over-approximates integer `multiplication`.
    ///
    #safe2((x, y) -> x * y)
    #strict2 #monotone2 #commutative #associative
    def times(e1: Constant, e2: Constant): Constant = match (e1, e2) with {
        case (Bot, _)           => Bot
        case (_, Bot)           => Bot
        case (Cst(n1), Cst(n2)) => Cst(n1 * n2)
        case _                  => Top
    }

    ///
    /// Over-approximates integer `division`.
    ///
    #safe2((x, y) -> x / y)
    #strict2 #monotone2
    def divide(e1: Constant, e2: Constant): Constant = match (e1, e2) with {
        case (Bot, _)           => Bot
        case (_, Bot)           => Bot
        case (Cst(n1), Cst(n2)) => Cst(n1 / n2)
        case _                  => Top
    }

    ///
    /// Over-approximates integer `modulus`.
    ///
    #safe2((x, y) -> x % y)
    #strict2 #monotone2
    def modulo(e1: Constant, e2: Constant): Constant = match (e1, e2) with {
        case (Bot, _)           => Bot
        case (_, Bot)           => Bot
        case (Cst(n1), Cst(n2)) => Cst(n1 % n2)
        case _                  => Top
    }

    ///
    /// Over-approximates `bitwise negation`.
    ///
    #safe1(x -> ~~~x)
    #strict1 #monotone1
    def negate(e: Constant): Constant = match e with {
        case Bot       => Bot
        case Cst(n)    => Cst(~~~ n)
        case Top       => Top
    }

    ///
    /// Over-approximates `bitwise and`.
    ///
    #safe2((x, y) -> x &&& y)
    #strict2 #monotone2 #commutative #associative
    def and(e1: Constant, e2: Constant): Constant = match (e1, e2) with {
        case (Bot, _)           => Bot
        case (_, Bot)           => Bot
        case (Cst(n1), Cst(n2)) => Cst(n1 &&& n2)
        case _                  => Top
    }

    ///
    /// Over-approximates `bitwise or`.
    ///
    #safe2((x, y) -> x ||| y)
    #strict2 #monotone2 #commutative #associative
    def or(e1: Constant, e2: Constant): Constant = match (e1, e2) with {
        case (Bot, _)           => Bot
        case (_, Bot)           => Bot
        case (Cst(n1), Cst(n2)) => Cst(n1 ||| n2)
        case _                  => Top
    }

    ///
    /// Over-approximates `bitwise xor`.
    ///
    #safe2((x, y) -> x ^^^ y)
    #strict2 #monotone2 #commutative #associative
    def xor(e1: Constant, e2: Constant): Constant = match (e1, e2) with {
        case (Bot, _)           => Bot
        case (_, Bot)           => Bot
        case (Cst(n1), Cst(n2)) => Cst(n1 ^^^ n2)
        case _                  => Top
    }

    ///
    /// Over-approximates `bitwise left shift`.
    ///
    #safe2((x, y) -> x <<< y)
    #strict2 #monotone2
    def leftShift(e1: Constant, e2: Constant): Constant = match (e1, e2) with {
        case (Bot, _)           => Bot
        case (_, Bot)           => Bot
        case (Cst(n1), Cst(n2)) => Cst(n1 <<< n2)
        case _                  => Top
    }

    ///
    /// Over-approximates `bitwise right shift`.
    ///
    ///
    #safe2((x, y) -> x >>> y)
    #strict2 #monotone2
    def rightShift(e1: Constant, e2: Constant): Constant = match (e1, e2) with {
        case (Bot, _)           => Bot
        case (_, Bot)           => Bot
        case (Cst(n1), Cst(n2)) => Cst(n1 >>> n2)
        case _                  => Top
    }

    ///
    /// Over-approximates `equal`.
    ///
    #PartialOrder.safe2((x, y) -> x == y, alpha, Belnap.alpha, Belnap.leq)
    #Bounded.strict2(Bot, Bot, Belnap/Belnap.Bot)
    #PartialOrder.monotone2(leq, leq, Belnap.leq)
    #commutative
    def eq(e1: Constant, e2: Constant): Belnap.Belnap = match (e1, e2) with {
        case (Bot, _)           => Belnap/Belnap.Bot
        case (_, Bot)           => Belnap/Belnap.Bot
        case (Cst(n1), Cst(n2)) => Belnap.alpha(n1 == n2)
        case _                  => Belnap/Belnap.Top
    }

    ///
    /// Over-approximates `not equal`.
    ///
    #PartialOrder.safe2((x, y) -> x != y, alpha, Belnap.alpha, Belnap.leq)
    #Bounded.strict2(Bot, Bot, Belnap/Belnap.Bot)
    #PartialOrder.monotone2(leq, leq, Belnap.leq)
    #commutative
    def neq(e1: Constant, e2: Constant): Belnap.Belnap = Belnap.not(eq(e1, e2))

    ///
    /// Over-approximates `less than`.
    ///
    #PartialOrder.safe2((x, y) -> x < y, alpha, Belnap.alpha, Belnap.leq)
    #Bounded.strict2(Bot, Bot, Belnap/Belnap.Bot)
    #PartialOrder.monotone2(leq, leq, Belnap.leq)
    def less(e1: Constant, e2: Constant): Belnap.Belnap = match (e1, e2) with {
        case (Bot, _)           => Belnap/Belnap.Bot
        case (_, Bot)           => Belnap/Belnap.Bot
        case (Cst(n1), Cst(n2)) => Belnap.alpha(n1 < n2)
        case _                  => Belnap/Belnap.Top
    }

    ///
    /// Over-approximates `less than or equal`.
    ///
    #PartialOrder.safe2((x, y) -> x <= y, alpha, Belnap.alpha, Belnap.leq)
    #Bounded.strict2(Bot, Bot, Belnap/Belnap.Bot)
    #PartialOrder.monotone2(leq, leq, Belnap.leq)
    def lessEqual(e1: Constant, e2: Constant): Belnap.Belnap = Belnap.or(e1 `less` e2, e1 `eq` e2)

    let Constant<> = (Bot, Top, equ, leq, lub, glb)

    //
    // ## Specialized Laws
    //

    law upperBound(lub: (Constant, Constant) -> Constant): Bool = JoinLattice.upperBound(leq, lub)

    law leastUpperBound(lub: (Constant, Constant) -> Constant): Bool = JoinLattice.leastUpperBound(leq, lub)

    law lowerBound(glb: (Constant, Constant) -> Constant): Bool = MeetLattice.lowerBound(leq, glb)

    law greatestLowerBound(glb: (Constant, Constant) -> Constant): Bool = MeetLattice.greatestLowerBound(leq, glb)

    law leastElement(leq: (Constant, Constant) -> Bool, bot: Constant): Bool = Bounded.leastElement(bot, leq)

    law greatestElement(leq: (Constant, Constant) -> Bool, top: Constant): Bool = Bounded.greatestElement(top, leq)

    law strict1(f: Constant -> Constant): Bool = Bounded.strict1(f, Bot, Bot)

    law strict2(f: (Constant, Constant) -> Constant): Bool = Bounded.strict2(f, Bot, Bot, Bot)

    law monotone1(f: Constant -> Constant): Bool = PartialOrder.monotone1(f, leq, leq)

    law monotone2(f: (Constant, Constant) -> Constant): Bool = PartialOrder.monotone2(f, leq, leq, leq)

    law safe1(fa: Constant -> Constant, fc: Int -> Int): Bool = PartialOrder.safe1(fa, fc, alpha, alpha, leq)

    law safe2(fa: (Constant, Constant) -> Constant, fc: (Int, Int) -> Int): Bool = PartialOrder.safe2(fa, fc, alpha, alpha, leq)

    ///
    /// Tests
    ///
    lat L(k: Int, y: Constant)
    lat R(k: Int, y: Constant)

    @test
    pub def testConstant01(): Schema { R } = solve {
        R(1, Bot).
        R(2, Cst(42)).
        R(3, Top).
    }

    @test
    pub def testConstant02(): Schema { R } = solve {
        R(1, Cst(1)).
        R(1, Cst(2)).
        R(1, Cst(3)).
    }

    @test
    pub def testConstant03(): Schema { L, R } = solve {
        L(1, Cst(1)).
        L(2, Cst(2)).
        L(3, Cst(3)).

        R(1, x) :- L(1, x), L(2, x), L(3, x).
    }

}