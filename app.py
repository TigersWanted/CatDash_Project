import os
from datetime import datetime

from flask import Flask, render_template, redirect, url_for, request, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from sqlalchemy import inspect, text

app = Flask(__name__)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///catdash.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
migrate = Migrate(app, db)

login_manager = LoginManager(app)
login_manager.login_view = "login"


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(30), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    coins = db.Column(db.Integer, default=0)
    total_coins_earned = db.Column(db.Integer, default=0, nullable=False)
    best_distance = db.Column(db.Float, default=0, nullable=False)

    dash_unlocked = db.Column(db.Boolean, default=False, nullable=False)
    pounce_unlocked = db.Column(db.Boolean, default=False, nullable=False)
    glide_unlocked = db.Column(db.Boolean, default=False, nullable=False)
    time_slow_unlocked = db.Column(db.Boolean, default=False, nullable=False)
    magnet_unlocked = db.Column(db.Boolean, default=False, nullable=False)
    fish_frenzy_unlocked = db.Column(db.Boolean, default=False, nullable=False)

    equipped_ability_one = db.Column(db.String(40), nullable=True)
    equipped_ability_two = db.Column(db.String(40), nullable=True)

    runs = db.relationship("Run", backref="user", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)


class Run(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    distance = db.Column(db.Float, nullable=False, default=0)
    coins_collected = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


def ensure_database_schema():
    db.create_all()

    inspector = inspect(db.engine)
    user_columns = {column["name"] for column in inspector.get_columns("user")}

    if "total_coins_earned" not in user_columns:
        db.session.execute(
            text("ALTER TABLE user ADD COLUMN total_coins_earned INTEGER NOT NULL DEFAULT 0")
        )

    if "best_distance" not in user_columns:
        db.session.execute(
            text("ALTER TABLE user ADD COLUMN best_distance FLOAT NOT NULL DEFAULT 0")
        )

    if "dash_unlocked" not in user_columns:
        db.session.execute(
            text("ALTER TABLE user ADD COLUMN dash_unlocked BOOLEAN NOT NULL DEFAULT 0")
        )

    if "pounce_unlocked" not in user_columns:
        db.session.execute(
            text("ALTER TABLE user ADD COLUMN pounce_unlocked BOOLEAN NOT NULL DEFAULT 0")
        )

    if "glide_unlocked" not in user_columns:
        db.session.execute(
            text("ALTER TABLE user ADD COLUMN glide_unlocked BOOLEAN NOT NULL DEFAULT 0")
        )

    if "time_slow_unlocked" not in user_columns:
        db.session.execute(
            text("ALTER TABLE user ADD COLUMN time_slow_unlocked BOOLEAN NOT NULL DEFAULT 0")
        )

    if "magnet_unlocked" not in user_columns:
        db.session.execute(
            text("ALTER TABLE user ADD COLUMN magnet_unlocked BOOLEAN NOT NULL DEFAULT 0")
        )

    if "fish_frenzy_unlocked" not in user_columns:
        db.session.execute(
            text("ALTER TABLE user ADD COLUMN fish_frenzy_unlocked BOOLEAN NOT NULL DEFAULT 0")
        )

    if "equipped_ability_one" not in user_columns:
        db.session.execute(
            text("ALTER TABLE user ADD COLUMN equipped_ability_one VARCHAR(40)")
        )

    if "equipped_ability_two" not in user_columns:
        db.session.execute(
            text("ALTER TABLE user ADD COLUMN equipped_ability_two VARCHAR(40)")
        )

    db.session.commit()


ABILITY_DEFINITIONS = {
    "dash": {
        "name": "Dash",
        "cost": 30,
        "keybind": "E",
        "field": "dash_unlocked",
        "description": "Jolt forward and clear gaps faster",
    },
    "pounce": {
        "name": "Pounce",
        "cost": 50,
        "keybind": "Q",
        "field": "pounce_unlocked",
        "description": "Launch into a stronger jump, usable in mid-air to recover from falling",
    },
    "glide": {
        "name": "Glide",
        "cost": 45,
        "keybind": "R",
        "field": "glide_unlocked",
        "description": "Slow your fall",
    },
    "time_slow": {
        "name": "Slow-Meow",
        "cost": 60,
        "keybind": "F",
        "field": "time_slow_unlocked",
        "description": "Slow the world for a short period of time",
    },
    "magnet": {
        "name": "Magnet",
        "cost": 75,
        "keybind": "C",
        "field": "magnet_unlocked",
        "description": "Pull nearby fish toward you for a short period of time",
    },
    "fish_frenzy": {
        "name": "Fish Frenzy",
        "cost": 100,
        "keybind": "V",
        "field": "fish_frenzy_unlocked",
        "description": "Double the fish you collect for a short period of time",
    },
}

def get_unlocked_abilities(user):
    unlocked = []
    for ability_id, config in ABILITY_DEFINITIONS.items():
        if getattr(user, config["field"]):
            unlocked.append(ability_id)
    return unlocked


def get_equipped_abilities(user):
    equipped = []
    for ability_id in [user.equipped_ability_one, user.equipped_ability_two]:
        if ability_id and ability_id in ABILITY_DEFINITIONS and ability_id not in equipped:
            equipped.append(ability_id)
    return equipped


def get_equipped_ability_cards(user):
    cards = []
    slot_data = [
        ("one", user.equipped_ability_one, "E", "Slot 1"),
        ("two", user.equipped_ability_two, "Q", "Slot 2"),
    ]

    for slot_id, ability_id, keybind, slot_label in slot_data:
        if ability_id and ability_id in ABILITY_DEFINITIONS:
            config = ABILITY_DEFINITIONS[ability_id]
            cards.append(
                {
                    "id": ability_id,
                    "name": config["name"],
                    "keybind": keybind,
                    "description": config["description"],
                    "slot": slot_id,
                    "slot_label": slot_label,
                }
            )
    return cards


def get_slot_ability_card(ability_id):
    if not ability_id or ability_id not in ABILITY_DEFINITIONS:
        return None

    config = ABILITY_DEFINITIONS[ability_id]
    return {
        "id": ability_id,
        "name": config["name"],
        "keybind": config["keybind"],
        "description": config["description"],
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")

        if not username or not password or not confirm_password:
            flash("Please fill out all fields.")
            return redirect(url_for("signup"))

        if password != confirm_password:
            flash("Passwords do not match.")
            return redirect(url_for("signup"))

        existing_user = User.query.filter_by(username=username).first()

        if existing_user:
            flash("Username already taken.")
            return redirect(url_for("signup"))

        new_user = User(username=username)
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()

        login_user(new_user)
        flash("Account created! Welcome to Cat Dash.")
        return redirect(url_for("game"))

    return render_template("signup.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            login_user(user)
            flash("Logged in successfully.")
            return redirect(url_for("game"))

        flash("Invalid username or password.")
        return redirect(url_for("login"))

    return render_template("login.html")

@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Logged out successfully.")
    return redirect(url_for("index"))

@app.route("/game")
@login_required
def game():
    return render_template(
        "game.html",
        equipped_abilities=get_equipped_ability_cards(current_user),
    )

@app.route("/leaderboard")
def leaderboard():
    distance_leaders = (
        User.query.order_by(User.best_distance.desc(), User.total_coins_earned.desc(), User.username.asc())
        .limit(20)
        .all()
    )
    coin_leaders = (
        User.query.order_by(User.total_coins_earned.desc(), User.best_distance.desc(), User.username.asc())
        .limit(20)
        .all()
    )

    player_distance_rank = None
    player_coin_rank = None

    if current_user.is_authenticated:
        distance_order = (
            User.query.order_by(
                User.best_distance.desc(),
                User.total_coins_earned.desc(),
                User.username.asc()
            ).all()
        )
        coin_order = (
            User.query.order_by(
                User.total_coins_earned.desc(),
                User.best_distance.desc(),
                User.username.asc()
            ).all()
        )

        for index, user in enumerate(distance_order, start=1):
            if user.id == current_user.id:
                player_distance_rank = index
                break

        for index, user in enumerate(coin_order, start=1):
            if user.id == current_user.id:
                player_coin_rank = index
                break

    return render_template(
        "leaderboard.html",
        distance_leaders=distance_leaders,
        coin_leaders=coin_leaders,
        player_distance_rank=player_distance_rank,
        player_coin_rank=player_coin_rank,
    )

@app.route("/shop")
@login_required
def shop():
    return render_template(
        "shop.html",
        ability_definitions=ABILITY_DEFINITIONS,
        equipped_abilities=get_equipped_abilities(current_user),
    )


@app.route("/inventory", methods=["GET", "POST"])
@login_required
def inventory():
    if request.method == "POST":
        ability_id = request.form.get("ability_id") or None
        target_slot = request.form.get("target_slot") or None
        clear_slot = request.form.get("clear_slot") or None
        unlocked = set(get_unlocked_abilities(current_user))

        if clear_slot:
            if clear_slot == "one":
                current_user.equipped_ability_one = None
            elif clear_slot == "two":
                current_user.equipped_ability_two = None
            else:
                flash("Unknown inventory slot.")
                return redirect(url_for("inventory"))

            db.session.commit()
            flash("Ability removed from slot.")
            return redirect(url_for("inventory"))

        if not ability_id or not target_slot:
            flash("Choose an ability and slot to equip.")
            return redirect(url_for("inventory"))

        if ability_id not in unlocked:
            flash("You can only equip unlocked abilities.")
            return redirect(url_for("inventory"))

        if target_slot not in {"one", "two"}:
            flash("Unknown inventory slot.")
            return redirect(url_for("inventory"))

        if target_slot == "one":
            if current_user.equipped_ability_two == ability_id:
                current_user.equipped_ability_two = current_user.equipped_ability_one
            current_user.equipped_ability_one = ability_id
        else:
            if current_user.equipped_ability_one == ability_id:
                current_user.equipped_ability_one = current_user.equipped_ability_two
            current_user.equipped_ability_two = ability_id

        db.session.commit()
        flash("Inventory updated.")
        return redirect(url_for("inventory"))

    unlocked_cards = [
        {
            "id": ability_id,
            "name": ABILITY_DEFINITIONS[ability_id]["name"],
            "keybind": ABILITY_DEFINITIONS[ability_id]["keybind"],
            "description": ABILITY_DEFINITIONS[ability_id]["description"],
        }
        for ability_id in get_unlocked_abilities(current_user)
    ]

    return render_template(
        "inventory.html",
        unlocked_abilities=unlocked_cards,
        equipped_abilities=get_equipped_abilities(current_user),
        slot_one_ability=get_slot_ability_card(current_user.equipped_ability_one),
        slot_two_ability=get_slot_ability_card(current_user.equipped_ability_two),
    )


@app.route("/profile")
@login_required
def profile():
    recent_runs = (
        Run.query.filter_by(user_id=current_user.id)
        .order_by(Run.created_at.desc())
        .limit(5)
        .all()
    )
    return render_template("profile.html", recent_runs=recent_runs)


@app.route("/shop/purchase", methods=["POST"])
@login_required
def purchase_shop_item():
    item = request.form.get("item")

    config = ABILITY_DEFINITIONS.get(item)
    if config:
        if getattr(current_user, config["field"]):
            flash(f"{config['name']} is already unlocked.")
            return redirect(url_for("shop"))

        cost = config["cost"]
        if current_user.coins < cost:
            flash(f"Not enough coins to unlock {config['name']}.")
            return redirect(url_for("shop"))

        current_user.coins -= cost
        setattr(current_user, config["field"], True)

        equipped = get_equipped_abilities(current_user)
        if len(equipped) < 2:
            if not current_user.equipped_ability_one:
                current_user.equipped_ability_one = item
            elif not current_user.equipped_ability_two and current_user.equipped_ability_one != item:
                current_user.equipped_ability_two = item

        db.session.commit()
        flash(f"{config['name']} unlocked.")
        return redirect(url_for("shop"))

    flash("Unknown shop item.")
    return redirect(url_for("shop"))


@app.route("/api/runs", methods=["POST"])
@login_required
def save_run():
    payload = request.get_json(silent=True) or {}

    try:
        distance = max(0, float(payload.get("distance", 0)))
        coins_collected = max(0, int(payload.get("coins_collected", 0)))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid run data."}), 400

    new_run = Run(
        user_id=current_user.id,
        distance=distance,
        coins_collected=coins_collected,
    )

    current_user.coins += coins_collected
    current_user.total_coins_earned += coins_collected
    current_user.best_distance = max(current_user.best_distance, distance)

    db.session.add(new_run)
    db.session.commit()

    return jsonify(
        {
            "ok": True,
            "best_distance": current_user.best_distance,
            "coins": current_user.coins,
            "total_coins_earned": current_user.total_coins_earned,
        }
    )


@app.cli.command("init-db")
def init_db():
    ensure_database_schema()
    print("Database created!")


with app.app_context():
    ensure_database_schema()


if __name__ == "__main__":
    app.run(debug=True)
